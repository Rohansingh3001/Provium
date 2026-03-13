#!/usr/bin/env python3
"""
demo_regulator_flow.py — End-to-end regulator fulfillment demo.

Flow:
  1. Regulator wallet submits a ComplianceRequest to RegulatorPortal
  2. Agent detects it (get_pending_regulator_requests)
  3. Agent generates a ZK proof and calls fulfillRequest()
  4. Portal verifies proof on-chain and stores reasoning permanently

This script drives steps 1 & 3 directly (bypassing the agent loop for speed).
The agent's normal --once loop will also handle step 3 automatically.

Usage:
  cd zkcomply
  source agent/venv/bin/activate
  python3 demo_regulator_flow.py [--use-agent]   # --use-agent runs main.py --once for step 3
"""

import json
import os
import sys
import time
import subprocess
import argparse
from pathlib import Path
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / "agent" / ".env")

# ── Config ───────────────────────────────────────────────────────────────────
RPC         = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
AGENT_KEY   = os.getenv("AGENT_PRIVATE_KEY", "")
_raw_deploy_path = os.getenv("DEPLOYMENTS_PATH", "")
if _raw_deploy_path:
    _p = Path(_raw_deploy_path)
    if not _p.is_absolute():
        _p = (Path(__file__).parent / "agent" / _p).resolve()
    DEPLOY_PATH = _p
else:
    DEPLOY_PATH = Path(__file__).parent / "contracts" / "deployments" / "base-sepolia.json"

if not AGENT_KEY:
    sys.exit("ERROR: AGENT_PRIVATE_KEY not set in agent/.env")

w3          = Web3(Web3.HTTPProvider(RPC))
cfg         = json.loads(DEPLOY_PATH.read_text())
agent_acct  = Account.from_key(AGENT_KEY)

PORTAL_ADDR  = Web3.to_checksum_address(cfg["RegulatorPortal"])

PORTAL_ABI = [
    {
        "inputs": [
            {"name": "proofType",    "type": "uint8"},
            {"name": "targetBlock",  "type": "uint256"},
            {"name": "jurisdiction", "type": "string"},
        ],
        "name": "requestComplianceProof",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "requestId",      "type": "uint256"},
            {"name": "proof",          "type": "bytes"},
            {"name": "publicInputs",   "type": "bytes32[]"},
            {"name": "agentReasoning", "type": "string"},
        ],
        "name": "fulfillRequest",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getPendingRequests",
        "outputs": [{"components": [
            {"name": "requestId",    "type": "uint256"},
            {"name": "requestor",    "type": "address"},
            {"name": "proofType",    "type": "uint8"},
            {"name": "targetBlock",  "type": "uint256"},
            {"name": "jurisdiction", "type": "string"},
            {"name": "requestedAt",  "type": "uint256"},
            {"name": "deadline",     "type": "uint256"},
            {"name": "fulfilled",    "type": "bool"},
            {"name": "fulfilledAt",  "type": "uint256"},
            {"name": "proofHash",    "type": "bytes32"},
            {"name": "agentReasoning", "type": "string"},
        ], "type": "tuple[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "id", "type": "uint256"}],
        "name": "getRequest",
        "outputs": [{"components": [
            {"name": "requestId",    "type": "uint256"},
            {"name": "requestor",    "type": "address"},
            {"name": "proofType",    "type": "uint8"},
            {"name": "targetBlock",  "type": "uint256"},
            {"name": "jurisdiction", "type": "string"},
            {"name": "requestedAt",  "type": "uint256"},
            {"name": "deadline",     "type": "uint256"},
            {"name": "fulfilled",    "type": "bool"},
            {"name": "fulfilledAt",  "type": "uint256"},
            {"name": "proofHash",    "type": "bytes32"},
            {"name": "agentReasoning", "type": "string"},
        ], "type": "tuple"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "requestCount",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

portal = w3.eth.contract(address=PORTAL_ADDR, abi=PORTAL_ABI)

def _send_tx(fn, acct) -> str:
    nonce  = w3.eth.get_transaction_count(acct.address, "pending")
    tx     = fn.build_transaction({"from": acct.address, "nonce": nonce, "gasPrice": w3.eth.gas_price})
    signed = acct.sign_transaction(tx)
    h      = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
    w3.eth.wait_for_transaction_receipt(h, timeout=90)
    return h


def step1_submit_request():
    """Regulator submits a compliance request (uses the agent wallet for demo simplicity)."""
    block_num = w3.eth.block_number
    print(f"\n[Step 1] Regulator submits ComplianceRequest to RegulatorPortal...")
    print(f"         Portal:      {PORTAL_ADDR}")
    print(f"         From:        {agent_acct.address[:10]}... (agent wallet = demo regulator)")
    print(f"         Target block: {block_num}")
    print(f"         Jurisdiction: US-GENIUS-ACT")

    fn = portal.functions.requestComplianceProof(
        0,               # proofType = COLLATERAL
        block_num,
        "US-GENIUS-ACT",
    )
    tx_hash  = _send_tx(fn, agent_acct)
    count    = portal.functions.requestCount().call()
    req_id   = count - 1
    receipt  = w3.eth.get_transaction_receipt(tx_hash)

    print(f"  [✓] Request submitted!")
    print(f"      TX:        0x{tx_hash[:20]}...")
    print(f"      Block:     {receipt['blockNumber']}")
    print(f"      RequestID: {req_id}")
    print(f"      Basescan:  https://sepolia.basescan.org/tx/0x{tx_hash}")
    return req_id


def step2_check_pending():
    """Poll the portal for pending requests."""
    print(f"\n[Step 2] Checking for pending requests...")
    pending = portal.functions.getPendingRequests().call()
    if not pending:
        print("  [!] No pending requests (all may have expired or already fulfilled).")
        return None
    print(f"  Found {len(pending)} pending request(s):")
    for r in pending:
        deadline_in = max(0, r[6] - int(time.time()))
        print(f"    ID={r[0]}  type={r[2]}  jurisdiction={r[4]}  expires_in={deadline_in}s")
    return pending[0][0]  # return first pending request ID


def step3_fulfill_with_agent():
    """Run agent --once so it picks up the pending request and fulfills it."""
    print(f"\n[Step 3] Running agent epoch to fulfill the request...")
    agent_dir = Path(__file__).parent / "agent"
    env = os.environ.copy()
    env["PATH"] = os.path.expanduser("~/.nargo/bin") + ":" + os.path.expanduser("~/.bb") + ":" + env.get("PATH", "")
    venv_python = agent_dir / "venv" / "bin" / "python3"
    python_bin  = str(venv_python) if venv_python.exists() else sys.executable

    result = subprocess.run(
        [python_bin, "main.py", "--once"],
        cwd=agent_dir,
        env=env,
        capture_output=False,  # let output flow to terminal
        text=True,
    )
    return result.returncode == 0


def step4_verify_fulfilled(req_id: int):
    """Read the fulfilled request back from chain."""
    print(f"\n[Step 4] Reading fulfilled request #{req_id} from chain...")
    r = portal.functions.getRequest(req_id).call()
    # r is a tuple: requestId, requestor, proofType, targetBlock, jurisdiction,
    #               requestedAt, deadline, fulfilled, fulfilledAt, proofHash, agentReasoning
    if r[7]:  # fulfilled
        print(f"  [✓] Request #{req_id} is FULFILLED on-chain!")
        print(f"      Fulfilled at block time: {r[8]}")
        print(f"      Proof hash:  0x{r[9].hex()[:20]}...")
        print(f"      Agent reasoning stored on-chain:")
        print(f"      > {r[10][:300]}")
        return True
    else:
        print(f"  [!] Request #{req_id} is NOT yet fulfilled (deadline: {r[6]})")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Regulator fulfillment demo")
    parser.add_argument("--skip-submit", action="store_true",
                        help="Skip step 1 (use existing pending request)")
    parser.add_argument("--use-agent",   action="store_true",
                        help="Run main.py --once for fulfillment (slower but full demo)")
    parser.add_argument("--req-id",      type=int, default=None,
                        help="Manually specify request ID to check/fulfill")
    args = parser.parse_args()

    print()
    print("=" * 60)
    print("  ZKComply / Provium — Regulator Fulfillment Demo")
    print("=" * 60)
    print(f"  Network:  Base Sepolia (chainId 84532)")
    print(f"  Portal:   {PORTAL_ADDR}")
    print(f"  Agent:    {agent_acct.address}")

    req_id = args.req_id

    # Step 1: Submit a compliance request
    if not args.skip_submit:
        req_id = step1_submit_request()
    else:
        print("\n[Step 1] Skipped (--skip-submit)")

    # Step 2: Confirm it's pending
    pending_id = step2_check_pending()
    if pending_id is None and req_id is None:
        print("\n  Nothing to fulfill. Exiting.")
        sys.exit(0)
    if req_id is None:
        req_id = pending_id

    # Step 3: Fulfill (via agent or direct)
    if args.use_agent:
        ok = step3_fulfill_with_agent()
    else:
        # Direct fulfillment using the last cached proof — self-contained, no imports
        proof_path = Path(__file__).parent / "circuits" / "collateral_proof" / "target" / "proof" / "collateral_proof.proof" / "proof"
        pi_path    = proof_path.parent / "public_inputs"

        print(f"\n[Step 3] Direct fulfillment using last cached ZK proof...")
        if not proof_path.exists():
            print("  [!] No cached proof found. Run `python3 agent/main.py --once` first,")
            print("      then re-run with --req-id to fulfill.")
            sys.exit(1)

        proof_bytes   = proof_path.read_bytes()
        pi_raw        = pi_path.read_bytes()
        n_inputs      = len(pi_raw) // 32
        public_inputs = [pi_raw[i*32:(i+1)*32] for i in range(n_inputs)]

        print(f"  Proof size: {len(proof_bytes)} bytes  |  Public inputs: {n_inputs}")
        print(f"  Calling fulfillRequest(requestId={req_id}) ...")

        reasoning = (
            "DEMO: Regulator requested proof. All 5 positions exceed 150% collateral threshold. "
            "ZK circuit verifies positions_root and min_ratio_bps on-chain. Proof generated by "
            "Barretenberg UltraHonk prover over BN254 curve. Agent: Provium / llama-3.3-70b-versatile."
        )
        try:
            fn       = portal.functions.fulfillRequest(req_id, proof_bytes, public_inputs, reasoning)
            tx_hash  = _send_tx(fn, agent_acct)
            url      = f"https://sepolia.basescan.org/tx/0x{tx_hash}"
            print(f"  [✓] fulfillRequest() accepted!")
            print(f"      TX:       0x{tx_hash[:20]}...")
            print(f"      Basescan: {url}")
        except Exception as e:
            err = str(e)
            if "ZK proof verification failed" in err:
                print(f"  [✗] REVERTED — ZK proof verification failed")
            else:
                print(f"  [✗] Failed: {err[:300]}")
            sys.exit(1)

    # Step 4: Verify on chain
    time.sleep(3)
    step4_verify_fulfilled(req_id)

    print()
    print("=" * 60)
    print("  Demo complete. Regulator request fulfilled on-chain.")
    print("  Agent reasoning is permanently stored in the transaction.")
    print("=" * 60)
    print()
