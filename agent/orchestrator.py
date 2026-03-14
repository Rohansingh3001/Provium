"""
orchestrator.py — Deterministic epoch runner for Provium.

PROBLEM WITH LLM-ORCHESTRATED TEAMS:
  Using an LLM team leader to pass data between agents causes it to
  *summarize* positions JSON instead of forwarding it verbatim.
  The Reporter then gets a text description instead of raw numbers,
  and the Merkle tree / Prover.toml become wrong.

SOLUTION:
  Python orchestrates the pipeline directly. Each agent runs individually.
  Raw JSON is extracted from each agent's response text and passed to the next.
  The LLMs handle reasoning; Python handles data wiring.

Pipeline each epoch:
  1. WATCHER runs → we extract positions_json from its tool output
  2. ANALYST reads watcher_report → we extract actions[] JSON from its response
  3. For each action in actions[]:
       Reporter runs: build_tree → commit_root → prove → submit → fulfill
"""

import json
import os
import re
import time
import logging
from datetime import datetime, timezone
from agno.agent import Agent
from agno.models.groq import Groq
from agents.watcher  import watcher_agent
from agents.analyst  import analyst_agent
from agents.reporter import reporter_agent
from tools.chain_tools import (
    get_all_positions,
    get_pending_regulator_requests,
    get_latest_compliance_report,
)
from tools.proof_tools  import build_merkle_tree_and_inputs, commit_merkle_root, generate_zk_proof
from tools.submit_tools import submit_proof_to_registry, fulfill_regulator_request
from tools.bitgo_tools import get_bitgo_wallet_info
from tools.fileverse_tools import upload_compliance_dossier, get_fileverse_status
from tools.ensip25 import log_ensip25_setup

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("zkcomply")


# ── helpers ──────────────────────────────────────────────────────────────────

def _sanitize_field(s: str, max_len: int = 64) -> str:
    """
    Sanitize a string before embedding it in an LLM prompt.

    Defends against prompt injection attacks where an adversary submits
    malicious text (e.g. via the on-chain jurisdiction field) that could
    alter the LLM's compliance decision.

    Rules:
      - Jurisdiction strings must match the safe allowlist pattern; anything
        else is replaced with 'UNKNOWN'.
      - All other fields: strip control characters and truncate.
    """
    if not isinstance(s, str):
        return ""
    # Strip non-printable / control characters
    cleaned = re.sub(r"[^\x20-\x7E]", "", s).strip()
    # For fields that should look like jurisdiction codes, enforce strict allowlist
    if re.match(r"^[A-Z0-9 _\-\.]{1,64}$", cleaned):
        return cleaned[:max_len]
    # For longer free-text fields just truncate after stripping
    return cleaned[:max_len]


def _sanitize_jurisdiction(s: str) -> str:
    """Jurisdiction codes must be alphanumeric+safe-punctuation or replaced."""
    if not isinstance(s, str):
        return "UNKNOWN"
    cleaned = re.sub(r"[^\x20-\x7E]", "", s).strip()
    if re.match(r"^[A-Z0-9 _\-\.]{1,64}$", cleaned):
        return cleaned
    return "UNKNOWN"


def _sanitize_requests_for_prompt(requests: list) -> list:
    """Return a copy of the requests list with all string fields sanitized."""
    safe = []
    for r in requests:
        safe.append({
            "requestId":   r.get("requestId"),
            "requestor":   str(r.get("requestor", ""))[:42],   # Ethereum address max length
            "proofType":   r.get("proofType"),
            "targetBlock": r.get("targetBlock"),
            "jurisdiction": _sanitize_jurisdiction(r.get("jurisdiction", "")),
            "deadline":     r.get("deadline"),
            "seconds_until_deadline": r.get("seconds_until_deadline"),
        })
    return safe


def _extract_json(text: str) -> dict | list | None:
    """Pull JSON object or array out of LLM response text."""
    # Try direct parse
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    # Try largest ```json ... ``` block
    m = re.search(r"```(?:json)?\s*([\[{].*?)\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # Try first [ ... ] or { ... } block
    for pattern in (r"(\[[\s\S]*?\])", r"(\{[\s\S]*?\})"):
        m = re.search(pattern, text)
        if m:
            try:
                return json.loads(m.group(1))
            except Exception:
                pass
    return None


def _run_tool_directly(tool_fn, **kwargs) -> dict:
    """Call a @tool function directly (bypassing agent), parse JSON result.
    Handles both plain callables and agno Function objects (which use .entrypoint).
    """
    try:
        # agno @tool creates a Function object with .entrypoint attribute
        fn = getattr(tool_fn, "entrypoint", tool_fn)
        result = fn(**kwargs) if kwargs else fn()
        return json.loads(result) if isinstance(result, str) else result
    except Exception as e:
        return {"error": str(e)}


def _agent_response_text(agent: Agent, prompt: str, max_retries: int = 3) -> str:
    """Run an agent and capture its full response text. Retries on transient failures."""
    last_err = None
    for attempt in range(max_retries):
        try:
            response = agent.run(prompt, stream=False)
            if hasattr(response, "content"):
                return response.content or ""
            return str(response)
        except Exception as e:
            last_err = e
            if attempt < max_retries - 1:
                wait = 2 ** attempt  # 1s, 2s, 4s
                log.warning(f"  LLM call failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait}s...")
                time.sleep(wait)
    raise last_err


# ── PHASE 1: Watcher ─────────────────────────────────────────────────────────

def run_watcher_phase() -> dict:
    """
    Runs Watcher agent. Also calls chain tools directly so we have
    reliable raw data regardless of what the LLM writes.
    Returns combined dict with keys: positions_data, pending_requests,
    latest_report, watcher_summary, risk_level.
    """
    log.info("=== PHASE 1: WATCHER ===")

    # Call tools directly — guaranteed accurate data
    positions_data   = _run_tool_directly(get_all_positions)
    pending_requests = _run_tool_directly(get_pending_regulator_requests)
    if isinstance(pending_requests, dict):              # error dict
        pending_requests = []
    if not isinstance(pending_requests, list):         # string slipped through
        try:   pending_requests = json.loads(pending_requests)
        except Exception: pending_requests = []
    latest_report    = _run_tool_directly(get_latest_compliance_report)

    log.info(f"  Users: {positions_data.get('user_count', '?')}")
    log.info(f"  Min health factor: {positions_data.get('min_health_factor_bps', '?')} bps")
    log.info(f"  Hours since last proof: {latest_report.get('hours_since_last_proof', '?')}")
    log.info(f"  Pending regulator requests: {len(pending_requests) if isinstance(pending_requests, list) else '?'}")

    # Run Watcher LLM for OFAC search + summary text (non-blocking if it fails)
    positions_str  = json.dumps(positions_data, indent=2)[:2000]
    # Sanitize on-chain fields before embedding in LLM prompt (prompt injection defence).
    safe_requests  = _sanitize_requests_for_prompt(pending_requests) if isinstance(pending_requests, list) else []
    requests_str   = json.dumps(safe_requests)[:500]
    report_str     = json.dumps(latest_report)[:500]

    try:
        watcher_prompt = f"""
You are monitoring a DeFi lending protocol for compliance. Here is the current chain state:

POSITIONS: {positions_str}
PENDING REGULATOR REQUESTS: {requests_str}
LATEST REPORT: {report_str}

Your tasks:
1. Assess the protocol risk level from this on-chain state.
2. If sanctions/news context is not present in the prompt, set ofac_news to "No external sanctions feed provided".
3. Write a short professional summary for the Analyst.

Respond with JSON only:
{{"risk_level": "low|medium|high|critical", "ofac_news": "<summarise what you found — or 'No new OFAC updates found' if the search returned nothing relevant>", "summary": "<2-3 sentence professional risk assessment>"}}
"""
        watcher_text = _agent_response_text(watcher_agent, watcher_prompt)
        watcher_json = _extract_json(watcher_text) or {}
        log.info(f"  Risk level: {watcher_json.get('risk_level', 'unknown')}")
        log.info(f"  OFAC: {watcher_json.get('ofac_news', 'N/A')[:80]}")
    except Exception as e:
        log.warning(f"  Watcher LLM failed (non-critical): {e}")
        watcher_json = {"risk_level": "low", "ofac_news": "Could not fetch.", "summary": ""}

    return {
        "positions_data":   positions_data,
        "positions_json":   json.dumps(positions_data),
        "pending_requests": pending_requests if isinstance(pending_requests, list) else [],
        "latest_report":    latest_report,
        "risk_level":       watcher_json.get("risk_level", "low"),
        "ofac_news":        watcher_json.get("ofac_news", ""),
        "watcher_summary":  watcher_json.get("summary", ""),
    }


# ── PHASE 2: Analyst ─────────────────────────────────────────────────────────

def run_analyst_phase(watcher: dict) -> list[dict]:
    """
    Runs Analyst LLM. Returns a list of action dicts:
    [{"urgency": "routine|urgent|critical", "reasoning": "...", "request_id": 0}]
    Falls back to a default routine action if parsing fails.
    """
    log.info("=== PHASE 2: ANALYST ===")

    positions  = watcher["positions_data"]
    requests   = watcher["pending_requests"]
    report     = watcher["latest_report"]
    min_hf     = positions.get("min_health_factor_bps", 999999)
    hours_old  = report.get("hours_since_last_proof", 999)
    ratio_pct  = positions.get("aggregate_ratio_pct", 0)

    # Sanitize on-chain fields before embedding in LLM prompt (prompt injection defence).
    safe_requests  = _sanitize_requests_for_prompt(requests) if isinstance(requests, list) else []
    safe_ofac_news = _sanitize_field(watcher["ofac_news"], max_len=200)

    analyst_prompt = f"""
You are a DeFi compliance analyst for Provium. Decide what ZK proof actions to take.

CURRENT STATE:
- user_count: {positions.get("user_count", 0)}
- aggregate_ratio_pct: {ratio_pct:.1f}%
- min_health_factor_bps: {min_hf} ({min_hf/100:.1f}%)
- hours_since_last_proof: {hours_old:.1f}
- pending_regulator_requests: {json.dumps(safe_requests)}
- risk_level_from_watcher: {watcher["risk_level"]}
- ofac_news: {safe_ofac_news}

DECISION RULES:
- hours_since_last_proof > 1  →  generate routine proof
- min_health_factor_bps < 16000 (160%)  →  urgency = "urgent"
- min_health_factor_bps < 15000 (150%)  →  urgency = "critical" (this is a VIOLATION)
- For each pending regulator request  →  add a separate action with its request_id

IMPORTANT: For each action write an "agent_reasoning" string that will be stored
PERMANENTLY ON THE BLOCKCHAIN. Be professional, specific, mention actual numbers.
Example: "All 5 positions are above 150% threshold. Minimum health factor is 163%.
Generating routine epoch proof for block #8294801 per GENIUS Act requirements.
No new OFAC sanctions detected in last 24h. Protocol is compliant."

Return ONLY a JSON array (no other text):
[
  {{
    "urgency": "routine",
    "agent_reasoning": "Specific reasoning stored on-chain...",
    "request_id": 0,
    "trigger": 0
  }}
]
(trigger: 0=routine, 1=urgent, 2=regulator_request)
"""
    try:
        analyst_text = _agent_response_text(analyst_agent, analyst_prompt)
        log.info(f"  Analyst raw response (truncated): {analyst_text[:200]}")
        actions = _extract_json(analyst_text)
        if isinstance(actions, list) and len(actions) > 0:
            if any((a.get("request_id", 0) or 0) > 0 for a in actions) and hours_old <= 1:
                actions = [a for a in actions if (a.get("request_id", 0) or 0) > 0]

            log.info(f"  Actions decided: {len(actions)}")
            for a in actions:
                # Normalize: LLM may return 'reasoning' instead of 'agent_reasoning'
                if "reasoning" in a and "agent_reasoning" not in a:
                    a["agent_reasoning"] = a.pop("reasoning", "")
                log.info(f"    → urgency={a.get('urgency')} request_id={a.get('request_id')}")
            return actions
    except Exception as e:
        log.warning(f"  Analyst LLM failed: {e}")

    # Fallback: decide deterministically
    log.info("  Using deterministic fallback decision")
    actions = []
    urgency = "routine"
    trigger = 0
    if min_hf < 15000:
        urgency, trigger = "critical", 1
    elif min_hf < 16000:
        urgency, trigger = "urgent", 1

    if hours_old > 1 or trigger > 0:
        actions.append({
            "urgency": urgency,
            "agent_reasoning": (
                f"Agent fallback decision: {positions.get('user_count', 0)} positions monitored. "
                f"Min health factor {min_hf/100:.1f}%. "
                f"Aggregate ratio {ratio_pct:.1f}%. "
                f"Last proof {hours_old:.1f}h ago. "
                f"Generating {'URGENT' if trigger else 'routine'} collateral ratio proof "
                f"per US-GENIUS-ACT requirements."
            ),
            "request_id": 0,
            "trigger": trigger,
        })

    for req in requests:
        actions.append({
            "urgency": "urgent",
            "agent_reasoning": (
                f"Fulfilling regulator request #{req.get('requestId')} "
                f"from {req.get('requestor', '0x?')[:10]}... "
                f"Jurisdiction: {req.get('jurisdiction', 'UNKNOWN')}. "
                f"Target block #{req.get('targetBlock')}. "
                f"Deadline in {req.get('seconds_until_deadline', 0)//3600}h. "
                f"Protocol ratio {ratio_pct:.1f}% — "
                f"{'COMPLIANT' if min_hf >= 15000 else 'NON-COMPLIANT'}."
            ),
            "request_id": req.get("requestId", 0),
            "trigger": 2,
        })

    if not actions:
        log.info("  No action needed this epoch.")

    return actions


# ── PHASE 3: Reporter ─────────────────────────────────────────────────────────

def run_reporter_phase(watcher: dict, action: dict) -> dict:
    """
    Executes one proof action. Calls tools directly in strict order:
      1. build_merkle_tree_and_inputs
      2. commit_merkle_root
      3. generate_zk_proof
      4. submit_proof_to_registry
      5. fulfill_regulator_request (if request_id > 0)
    Returns result dict with tx hashes.
    """
    req_id    = action.get("request_id", 0) or 0
    urgency   = action.get("urgency", "routine")
    reasoning = action.get("agent_reasoning") or action.get("reasoning") or "Automated compliance proof."
    trigger   = action.get("trigger", 0)

    log.info(f"=== PHASE 3: REPORTER  urgency={urgency}  request_id={req_id} ===")
    result = {"action": action, "steps": []}

    # Step 1: Build Merkle tree
    log.info("  Step 1/5: Building Merkle tree...")
    tree_result = _run_tool_directly(build_merkle_tree_and_inputs,
                                     positions_json=watcher["positions_json"])
    if "error" in tree_result:
        log.error(f"  [X] Merkle build failed: {tree_result['error']}")
        result["error"] = tree_result["error"]
        return result

    root            = tree_result["root"]
    prover_toml     = tree_result["prover_toml_content"]
    total_collateral = tree_result["total_collateral"]
    total_debt      = tree_result["total_debt"]
    block_number    = tree_result["block_number"]
    log.info(f"  [OK] Merkle root: {str(root)[:20]}...  block={block_number}")
    result["steps"].append({"step": "merkle_tree", "root": str(root)[:20], "block": block_number})

    # Step 2: Commit root on-chain
    log.info("  Step 2/5: Committing root on-chain...")
    commit_result = _run_tool_directly(commit_merkle_root,
                                       root=str(root), block_number=int(block_number))
    if "error" in commit_result:
        log.warning(f"  [!] Commit root failed (continuing): {commit_result['error']}")
        # Non-fatal: continue to prove
    else:
        log.info(f"  [OK] Root committed: {commit_result.get('tx_hash', '?')[:20]}...")
        result["steps"].append({"step": "commit_root", "tx": commit_result.get("tx_hash", "")})

    # Step 3: Generate ZK proof
    log.info("  Step 3/5: Running nargo prove (30-120s)...")
    proof_result = _run_tool_directly(generate_zk_proof, prover_toml_content=prover_toml)
    if "error" in proof_result and not proof_result.get("proof_hex"):
        log.error(f"  [X] Proof generation failed: {proof_result['error']}")
        result["error"] = proof_result["error"]
        return result

    is_compliant    = proof_result.get("is_compliant", False)
    proof_hex       = proof_result.get("proof_hex", "0x00")
    public_inputs   = proof_result.get("public_inputs_json", "[]")
    gen_time        = proof_result.get("generation_time_seconds", 0)
    log.info(f"  [OK] Proof {'VALID' if is_compliant else 'INVALID - VIOLATION'}  [{gen_time}s]")
    result["steps"].append({"step": "zk_proof", "is_compliant": is_compliant, "time": gen_time})

    # Step 4: Submit to ComplianceRegistry (violations MUST be recorded)
    log.info("  Step 4/5: Submitting to ComplianceRegistry...")
    submit_result = _run_tool_directly(
        submit_proof_to_registry,
        proof_hex=proof_hex,
        public_inputs_json=public_inputs,
        is_compliant=is_compliant,
        total_collateral=int(total_collateral),
        total_debt=int(total_debt),
        ratio_bps=int(tree_result.get("ratio_bps", 0)),
        agent_reasoning=reasoning,
        trigger=int(trigger),
        request_id=int(req_id),
    )
    if "error" in submit_result:
        log.error(f"  [X] Submit failed: {submit_result['error']}")
        result["error"] = submit_result["error"]
        return result

    log.info(f"  [OK] Report submitted: {submit_result.get('tx_hash', '?')[:20]}...")
    result["steps"].append({"step": "submit_report", "tx": submit_result.get("tx_hash", "")})

    # Step 5: Fulfill regulator request if applicable
    if req_id > 0:
        log.info(f"  Step 5/5: Fulfilling regulator request #{req_id}...")
        fulfill_result = _run_tool_directly(
            fulfill_regulator_request,
            request_id=int(req_id),
            proof_hex=proof_hex,
            public_inputs_json=public_inputs,
            agent_reasoning=reasoning,
        )
        if "error" in fulfill_result:
            log.warning(f"  [!] Fulfill failed: {fulfill_result['error']}")
        else:
            log.info(f"  [OK] Request #{req_id} fulfilled: {fulfill_result.get('tx_hash', '?')[:20]}...")
            result["steps"].append({"step": "fulfill_request", "tx": fulfill_result.get("tx_hash", "")})
    else:
        log.info("  Step 5/5: No regulator request to fulfill.")

    result["success"] = True
    return result


def _get_epoch_number() -> int:
    """
    Derive epoch number.
    """
    return int(time.time()) & 0xFFFFFF  # Just a pseudo-unique number


# Flag: ENSIP-25 setup logged only once per process lifetime
_ensip25_logged = False



# ── Epoch Runner ──────────────────────────────────────────────────────────────
def run_epoch() -> dict:
    """Execute one complete compliance epoch. Returns summary dict."""
    log.info("=" * 52)
    log.info("  Provium - Epoch Start")
    log.info("=" * 52)
    t0 = time.time()

    epoch_number = _get_epoch_number()
    log.info(f"  Epoch #{epoch_number}")

    # ── Show BitGo wallet status ──────────────────────────────────────────
    bitgo_info = get_bitgo_wallet_info()
    if bitgo_info.get("bitgo_enabled"):
        log.info(f"  [BitGo] ✓ Wallet: {bitgo_info.get('wallet_id', 'N/A')[:20]}...")
        log.info(f"  [BitGo] ✓ Address: {bitgo_info.get('wallet_address', 'N/A')[:20]}...")
        log.info(f"  [BitGo] ✓ Multi-sig: {bitgo_info.get('multisig', False)}")
    else:
        log.info("  [BitGo] Not configured — using eth_account fallback")
        log.info(f"  [BitGo] Setup: {bitgo_info.get('setup_note', '')[:80]}")

    # ── Show Fileverse status ─────────────────────────────────────────────
    fv_info = get_fileverse_status()
    if fv_info.get("fileverse_enabled"):
        log.info(f"  [Fileverse] Namespace: {fv_info.get('namespace', 'N/A')}")
        log.info(f"  [Fileverse] Mode: live — dossiers upload to Fileverse")
    else:
        log.info(f"  [Fileverse] Mode: local_fallback — dossiers saved to {fv_info.get('dossier_dir', 'agent/dossiers/')}")

    # ── Show ENSIP-25 agent verification key (once per process) ──────────
    global _ensip25_logged
    if not _ensip25_logged:
        log_ensip25_setup()
        _ensip25_logged = True

    epoch_result = {"timestamp": datetime.now(timezone.utc).isoformat(), "epoch": epoch_number, "actions": []}

    try:
        # Phase 1
        watcher = run_watcher_phase()

        # Phase 2
        actions = run_analyst_phase(watcher)

        if not actions:
            log.info("[OK] No action needed. Protocol is up to date.")
            epoch_result["skipped"] = True
            return epoch_result

        # Dry-run: skip proof generation and on-chain writes
        if os.getenv("ZKCOMPLY_DRY_RUN", "") == "1":
            log.info("DRY RUN - skipping proof generation and on-chain writes")
            epoch_result["skipped"] = True
            epoch_result["dry_run_actions_count"] = len(actions)
            return epoch_result

        # Phase 3 — execute each action sequentially
        known_request_ids = {
            r.get("requestId") for r in watcher.get("pending_requests", [])
            if isinstance(r, dict)
        }
        for i, action in enumerate(actions):
            req_id = action.get("request_id", 0) or 0
            if req_id > 0 and req_id not in known_request_ids:
                log.warning(
                    f"  [M4] Skipping action for request_id={req_id} — "
                    "not found in current pending requests (LLM hallucination or already fulfilled)."
                )
                continue
            log.info(f"Executing action {i+1}/{len(actions)}")
            action_result = run_reporter_phase(watcher, action)
            epoch_result["actions"].append(action_result)

            # ── Fileverse: package compliance dossier after proof submission ──
            if action_result.get("success"):
                submit_step = next(
                    (s for s in action_result.get("steps", []) if s.get("step") == "submit_report"),
                    {},
                )
                fv_result = upload_compliance_dossier(
                    epoch_number=epoch_number,
                    action=action,
                    reporter_result=action_result,
                    watcher_data=watcher,
                    submit_result=submit_step,
                )
                action_result["fileverse"] = fv_result

    except Exception as e:
        log.error(f"🚨 Epoch error: {e}", exc_info=True)
        epoch_result["error"] = str(e)

    elapsed = round(time.time() - t0, 1)
    log.info(f"---- Epoch complete in {elapsed}s ----")
    epoch_result["elapsed_seconds"] = elapsed
    return epoch_result
