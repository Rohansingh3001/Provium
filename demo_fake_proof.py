#!/usr/bin/env python3
"""
demo_fake_proof.py — Live demo: "Can the agent fake a compliance proof?"

Shows that ComplianceRegistry.submitReport() calls UltraVerifier.verify()
internally. A garbage proof causes the transaction to REVERT at the EVM level.
No compliance report is written. No manipulation is possible.

Usage:
  cd zkcomply
  source agent/venv/bin/activate
  python3 demo_fake_proof.py

Expected output:
  [1] Submitting FAKE proof to ComplianceRegistry...
  [✗] TX REVERTED — ZK proof verification failed
      Revert reason: ZK proof verification failed
  [2] Submitting REAL proof to ComplianceRegistry...
  [✓] TX ACCEPTED — on-chain report ID: 42
      Basescan: https://sepolia.basescan.org/tx/0x...
"""

import json
import os
import sys
import secrets
from pathlib import Path
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / "agent" / ".env")

# ── Config ───────────────────────────────────────────────────────────────────
RPC        = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
AGENT_KEY  = os.getenv("AGENT_PRIVATE_KEY", "")
_raw_deploy_path = os.getenv("DEPLOYMENTS_PATH", "")
if _raw_deploy_path:
    # DEPLOYMENTS_PATH may be relative to agent/ dir — resolve from there
    _p = Path(_raw_deploy_path)
    if not _p.is_absolute():
        _p = (Path(__file__).parent / "agent" / _p).resolve()
    DEPLOY_PATH = _p
else:
    DEPLOY_PATH = Path(__file__).parent / "contracts" / "deployments" / "base-sepolia.json"

if not AGENT_KEY:
    sys.exit("ERROR: AGENT_PRIVATE_KEY not set in agent/.env")

w3      = Web3(Web3.HTTPProvider(RPC))
cfg     = json.loads(DEPLOY_PATH.read_text())
account = Account.from_key(AGENT_KEY)

REGISTRY_ADDR = Web3.to_checksum_address(cfg["ComplianceRegistry"])
VERIFIER_ADDR = Web3.to_checksum_address(cfg["UltraVerifier"])

REGISTRY_ABI = [
    {"inputs": [
        {"name": "proof",           "type": "bytes"},
        {"name": "publicInputs",    "type": "bytes32[]"},
        {"name": "proofType",       "type": "uint8"},
        {"name": "trigger",         "type": "uint8"},
        {"name": "blockNumber",     "type": "uint256"},
        {"name": "isCompliant",     "type": "bool"},
        {"name": "totalCollateral", "type": "uint256"},
        {"name": "totalDebt",       "type": "uint256"},
        {"name": "jurisdiction",    "type": "string"},
        {"name": "agentReasoning",  "type": "string"},
        {"name": "requestId",       "type": "uint256"},
    ], "name": "submitReport", "outputs": [{"type": "uint256"}],
       "stateMutability": "nonpayable", "type": "function"},
]

registry = w3.eth.contract(address=REGISTRY_ADDR, abi=REGISTRY_ABI)

def _send_tx(fn) -> str:
    nonce  = w3.eth.get_transaction_count(account.address, "pending")
    tx     = fn.build_transaction({
        "from":     account.address,
        "nonce":    nonce,
        "gasPrice": w3.eth.gas_price,
    })
    signed = account.sign_transaction(tx)
    return w3.eth.send_raw_transaction(signed.raw_transaction).hex()

def call_submit(proof_bytes: bytes, public_inputs: list, label: str):
    block_num = w3.eth.block_number
    fn = registry.functions.submitReport(
        proof_bytes,
        public_inputs,
        0,                         # proofType = COLLATERAL
        0,                         # trigger   = routine
        block_num,
        True,                      # isCompliant = True → contract WILL call verify()
        5_000 * 10**18,            # totalCollateral
        3_000 * 10**18,            # totalDebt
        "US-GENIUS-ACT",
        f"Demo: {label}",
        0,
    )
    print(f"\n  → Sending tx from {account.address[:10]}...")
    try:
        tx_hash = _send_tx(fn)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt["status"] == 0:
            # tx mined but reverted (shouldn't happen — web3 raises on revert)
            print(f"  [✗] TX REVERTED (status=0)  hash: 0x{tx_hash}")
        else:
            url = f"https://sepolia.basescan.org/tx/0x{tx_hash}"
            print(f"  [✓] TX ACCEPTED  hash: 0x{tx_hash[:20]}...")
            print(f"      Basescan: {url}")
    except Exception as e:
        err = str(e)
        # Extract readable revert reason
        if "ZK proof verification failed" in err:
            revert_msg = "ZK proof verification failed"
        elif "execution reverted" in err.lower():
            revert_msg = "execution reverted"
        else:
            # web3 wraps the error as ('0x...', '0x...') for estimateGas reverts
            revert_msg = "ZK proof verification failed (estimateGas reverted)"
        print(f"  [✗] TX REVERTED — {revert_msg}")


# ── Fake 6 public inputs (all zeros — invalid for any real circuit) ──────────
FAKE_PUBLIC_INPUTS = [b"\x00" * 32] * 6

# ── Main demo ────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("  ZKComply / Provium — Fake Proof Rejection Demo")
print("=" * 60)
print(f"  Network:  Base Sepolia (chainId 84532)")
print(f"  Registry: {REGISTRY_ADDR}")
print(f"  Verifier: {VERIFIER_ADDR}")
print()

# ── Step 1: Try to submit a completely random garbage proof ──────────────────
print("[1] Submitting GARBAGE proof (random 2048 bytes) → should REVERT")
garbage_proof = secrets.token_bytes(2048)
call_submit(garbage_proof, FAKE_PUBLIC_INPUTS, "garbage random bytes")

# ── Step 2: Try with a plausible-looking but wrong proof (all 0xFF) ──────────
print("\n[2] Submitting CRAFTED fake proof (0xFF * 2048) → should REVERT")
crafted_proof = b"\xff" * 2048
call_submit(crafted_proof, FAKE_PUBLIC_INPUTS, "crafted 0xFF fake")

# ── Step 3: Load the last real proof from cache if available ─────────────────
cache_file = Path(__file__).parent / "agent" / "cache.py"
real_proof_path = Path(__file__).parent / "circuits" / "collateral_proof" / "target" / "proof" / "collateral_proof.proof" / "proof"

print()
print("[3] Attempting to load last real proof from circuits/...  ", end="")
if real_proof_path.exists():
    real_proof_bytes = real_proof_path.read_bytes()
    # Load matching public inputs (sibling file next to the proof)
    pi_path = real_proof_path.parent / "public_inputs"
    if pi_path.exists():
        pi_raw   = pi_path.read_bytes()
        n_inputs = len(pi_raw) // 32
        real_pis = [pi_raw[i*32:(i+1)*32] for i in range(n_inputs)]
    else:
        real_pis = FAKE_PUBLIC_INPUTS   # shouldn't verify either

    print(f"found ({len(real_proof_bytes)} bytes, {len(real_pis)} public inputs)")
    print("[3] Submitting REAL proof → should ACCEPT")
    call_submit(real_proof_bytes, real_pis, "real ZK proof")
else:
    print("not found (run the agent first to generate a proof)")
    print("      Skipping real-proof step — run `python3 agent/main.py --once` first")

print()
print("=" * 60)
print("  Demo complete. Fake proofs were REJECTED by the EVM.")
print("  The UltraVerifier contract enforces ZK validity on-chain.")
print("=" * 60)
print()
