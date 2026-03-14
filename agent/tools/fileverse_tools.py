"""
fileverse_tools.py — Fileverse integration for Provium compliance dossiers.

WHY FILEVERSE:
  On-chain storage is optimized for proof hashes and short reasoning strings.
  Regulators need *rich* compliance dossiers: full proof metadata, tx links,
  agent reasoning snapshots, position summaries, timestamps — all in one
  portable, encrypted-capable document.

  Fileverse provides:
    - Decentralized document storage (IPFS/Filecoin-backed)
    - Encryption-ready workflows for sensitive compliance data
    - Permanent, addressable dossier URLs for regulator handoff
    - Hash-based integrity verification

ARCHITECTURE:
  After each proof submission (Step 4 in Reporter pipeline), the agent
  packages a compliance dossier JSON and uploads it to Fileverse.
  The returned file hash/URL is logged alongside the on-chain tx hash.

  This is a SHOULD-HAVE, never a blocker. Every Fileverse call is wrapped
  in try/except — if the API is down, the core loop continues unaffected.

FALLBACK:
  If FILEVERSE_API_KEY is not set, dossiers are saved to local disk at
  agent/dossiers/ as a fallback evidence trail.

SETUP INSTRUCTIONS (for judges):
  1. Go to https://fileverse.io → Create account / get API access
  2. Obtain your API key and namespace/portal ID
  3. Add to .env: FILEVERSE_API_KEY, FILEVERSE_NAMESPACE
  4. Dossiers will automatically upload after each proof submission
"""

import json
import os
import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

try:
    import requests
except ImportError:
    requests = None  # type: ignore[assignment]

load_dotenv()

log = logging.getLogger("zkcomply.fileverse")

# ── Fileverse Config ──────────────────────────────────────────────────────────
FILEVERSE_API_KEY   = os.getenv("FILEVERSE_API_KEY", "")
FILEVERSE_NAMESPACE = os.getenv("FILEVERSE_NAMESPACE", "")
FILEVERSE_BASE_URL  = os.getenv(
    "FILEVERSE_BASE_URL",
    "https://api.fileverse.io/v1",
)

FILEVERSE_ENABLED = bool(FILEVERSE_API_KEY and FILEVERSE_NAMESPACE)

# Local fallback directory for dossiers when Fileverse is not configured
DOSSIER_DIR = Path(__file__).parent.parent / "dossiers"


# ── Dossier Builder ──────────────────────────────────────────────────────────

def build_compliance_dossier(
    epoch_number: int,
    action: dict,
    reporter_result: dict,
    watcher_data: dict,
    submit_result: dict,
) -> dict:
    """
    Package all compliance artifacts into a single dossier document.
    This is the "regulator packet" — everything a regulator needs in one place.
    """
    now = datetime.now(timezone.utc).isoformat()
    tx_hash = submit_result.get("tx_hash", "")
    block_number = submit_result.get("block_number", "")

    dossier = {
        "schema": "provium-compliance-dossier-v1",
        "generated_at": now,
        "epoch": epoch_number,

        # On-chain references
        "chain": {
            "network": "Base Sepolia",
            "chain_id": 84532,
            "tx_hash": tx_hash,
            "block_number": block_number,
            "basescan_url": f"https://sepolia.basescan.org/tx/{tx_hash}" if tx_hash else "",
            "verified_on_chain": submit_result.get("verified_on_chain", False),
        },

        # Proof metadata
        "proof": {
            "type": "collateral_ratio",
            "circuit": "collateral_proof (Noir/BN254/UltraHonk)",
            "is_compliant": any(
                s.get("is_compliant", False)
                for s in reporter_result.get("steps", [])
                if s.get("step") == "zk_proof"
            ),
            "generation_time_seconds": next(
                (s.get("time", 0) for s in reporter_result.get("steps", []) if s.get("step") == "zk_proof"),
                0,
            ),
        },

        # Agent decision
        "agent": {
            "urgency": action.get("urgency", "routine"),
            "trigger": action.get("trigger", 0),
            "request_id": action.get("request_id", 0),
            "reasoning": action.get("agent_reasoning", ""),
        },

        # Protocol snapshot
        "protocol_snapshot": {
            "user_count": watcher_data.get("positions_data", {}).get("user_count", 0),
            "aggregate_ratio_pct": watcher_data.get("positions_data", {}).get("aggregate_ratio_pct", 0),
            "min_health_factor_bps": watcher_data.get("positions_data", {}).get("min_health_factor_bps", 0),
            "risk_level": watcher_data.get("risk_level", "unknown"),
        },

        # Jurisdiction
        "jurisdiction": "US-GENIUS-ACT",
    }

    # Compute content hash for integrity verification
    dossier_bytes = json.dumps(dossier, sort_keys=True).encode()
    dossier["content_hash"] = hashlib.sha256(dossier_bytes).hexdigest()

    return dossier


# ── Fileverse Upload ─────────────────────────────────────────────────────────

def _upload_to_fileverse(dossier: dict) -> dict:
    """
    Upload a compliance dossier to Fileverse.
    Returns: {"file_id": "...", "url": "...", "hash": "..."}
    """
    if requests is None:
        return {"error": "requests library not available"}

    url = f"{FILEVERSE_BASE_URL}/namespaces/{FILEVERSE_NAMESPACE}/files"
    headers = {
        "Authorization": f"Bearer {FILEVERSE_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "name": f"provium-dossier-epoch-{dossier.get('epoch', 0)}.json",
        "content": json.dumps(dossier, indent=2),
        "contentType": "application/json",
        "metadata": {
            "type": "compliance-dossier",
            "schema": dossier.get("schema", ""),
            "epoch": dossier.get("epoch", 0),
            "tx_hash": dossier.get("chain", {}).get("tx_hash", ""),
            "jurisdiction": dossier.get("jurisdiction", ""),
        },
    }

    resp = requests.post(url, json=payload, headers=headers, timeout=30)

    if resp.status_code in (200, 201):
        result = resp.json()
        return {
            "file_id": result.get("id", result.get("fileId", "")),
            "url": result.get("url", result.get("gatewayUrl", "")),
            "hash": result.get("hash", result.get("contentHash", "")),
            "source": "fileverse",
        }
    else:
        return {
            "error": f"Fileverse HTTP {resp.status_code}: {resp.text[:200]}",
            "source": "fileverse",
        }


def _save_to_local(dossier: dict) -> dict:
    """
    Fallback: save dossier to local disk when Fileverse is not configured.
    """
    DOSSIER_DIR.mkdir(parents=True, exist_ok=True)
    epoch = dossier.get("epoch", 0)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"dossier_epoch{epoch}_{ts}.json"
    filepath = DOSSIER_DIR / filename

    filepath.write_text(json.dumps(dossier, indent=2))

    return {
        "file_id": filename,
        "url": str(filepath),
        "hash": dossier.get("content_hash", ""),
        "source": "local",
    }


# ── Main Integration Function ────────────────────────────────────────────────

def upload_compliance_dossier(
    epoch_number: int,
    action: dict,
    reporter_result: dict,
    watcher_data: dict,
    submit_result: dict,
) -> dict:
    """
    Build and upload a compliance dossier after proof submission.
    This is the KEY integration point called from orchestrator.py.

    Returns:
      {"file_id": "...", "url": "...", "hash": "...", "source": "fileverse"|"local"}
      or {"error": "..."} on failure.

    NEVER raises — always returns a dict. The caller logs the result
    and continues regardless.
    """
    try:
        dossier = build_compliance_dossier(
            epoch_number=epoch_number,
            action=action,
            reporter_result=reporter_result,
            watcher_data=watcher_data,
            submit_result=submit_result,
        )

        if FILEVERSE_ENABLED:
            log.info("  [Fileverse] Uploading compliance dossier...")
            result = _upload_to_fileverse(dossier)
            if "error" not in result:
                log.info(f"  [Fileverse] Dossier uploaded: {result.get('url', result.get('file_id', ''))[:60]}")
                return result
            else:
                log.warning(f"  [Fileverse] Upload failed: {result['error'][:100]} — saving locally")
                # Fall through to local save

        # Local fallback
        result = _save_to_local(dossier)
        if FILEVERSE_ENABLED:
            log.info(f"  [Fileverse] Fallback: saved locally at {result['url']}")
        else:
            log.info(f"  [Fileverse] Not configured — dossier saved locally: {result['file_id']}")
        return result

    except Exception as e:
        log.warning(f"  [Fileverse] Dossier packaging failed (non-critical): {e}")
        return {"error": str(e), "source": "error"}


def get_fileverse_status() -> dict:
    """
    Return Fileverse integration status for logging/display.
    Mirrors the pattern from bitgo_tools.get_bitgo_wallet_info().
    """
    if FILEVERSE_ENABLED:
        return {
            "fileverse_enabled": True,
            "namespace": FILEVERSE_NAMESPACE,
            "base_url": FILEVERSE_BASE_URL,
            "mode": "live",
        }
    else:
        return {
            "fileverse_enabled": False,
            "mode": "local_fallback",
            "dossier_dir": str(DOSSIER_DIR),
            "setup_note": (
                "To enable Fileverse: "
                "1. Get API access at https://fileverse.io "
                "2. Add FILEVERSE_API_KEY + FILEVERSE_NAMESPACE to .env"
            ),
        }
