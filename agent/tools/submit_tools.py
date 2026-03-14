"""
submit_tools.py — Real on-chain writes: submit report to ComplianceRegistry,
fulfill requests in RegulatorPortal. Signs and sends real txns.
"""
import json
import os
import logging
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv
from agno.tools import tool
from tools.bitgo_tools import send_via_bitgo
from tools.tx_utils import _get_account, _eip1559_params

load_dotenv()

log = logging.getLogger("zkcomply.submit")


def _is_dry_run() -> bool:
    return os.getenv("ZKCOMPLY_DRY_RUN", "") == "1"


RPC         = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
DEPLOYMENTS = Path(os.getenv("DEPLOYMENTS_PATH", "../contracts/deployments/base-sepolia.json"))

w3 = Web3(Web3.HTTPProvider(RPC))

try:
    cfg = json.loads(DEPLOYMENTS.read_text())
    REGISTRY_ADDR = Web3.to_checksum_address(cfg["ComplianceRegistry"])
    PORTAL_ADDR   = Web3.to_checksum_address(cfg["RegulatorPortal"])
    VERIFIER_ADDR = Web3.to_checksum_address(cfg["UltraVerifier"])
except Exception as e:
    print(f"WARNING: submit_tools: {e}")
    REGISTRY_ADDR = PORTAL_ADDR = VERIFIER_ADDR = "0x0000000000000000000000000000000000000000"

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
    ], "name": "submitReport", "outputs": [{"type": "uint256"}], "stateMutability": "nonpayable", "type": "function"},
]

PORTAL_ABI = [
    {"inputs": [
        {"name": "requestId",    "type": "uint256"},
        {"name": "proof",        "type": "bytes"},
        {"name": "publicInputs", "type": "bytes32[]"},
        {"name": "agentReasoning", "type": "string"},
    ], "name": "fulfillRequest", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
]

VERIFIER_ABI = [
    {"inputs": [{"name": "proof", "type": "bytes"}, {"name": "publicInputs", "type": "bytes32[]"}],
     "name": "verify", "outputs": [{"type": "bool"}], "stateMutability": "view", "type": "function"},
]

registry = w3.eth.contract(address=REGISTRY_ADDR, abi=REGISTRY_ABI)
portal   = w3.eth.contract(address=PORTAL_ADDR,   abi=PORTAL_ABI)
verifier = w3.eth.contract(address=VERIFIER_ADDR,  abi=VERIFIER_ABI)


def _with_0x(tx_hash: str) -> str:
    return tx_hash if tx_hash.startswith("0x") else f"0x{tx_hash}"


def _send_tx(fn, account) -> str:
    """Build, sign, send, wait. Returns tx hash hex."""
    calldata = fn._encode_transaction_data()

    bitgo_result = send_via_bitgo(fn.address, calldata)
    if bitgo_result and bitgo_result.get("txid"):
        tx_hash = str(bitgo_result["txid"])
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        return receipt["transactionHash"].hex()

    last_error = None
    for _ in range(2):
        try:
            nonce = w3.eth.get_transaction_count(account.address, "pending")
            tx = fn.build_transaction({
                "from":  account.address,
                "nonce": nonce,
                **_eip1559_params(w3),
            })
            signed = account.sign_transaction(tx)
            h = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
            w3.eth.wait_for_transaction_receipt(h, timeout=90)
            return h
        except ValueError as e:
            last_error = e
            if "nonce too low" not in str(e).lower():
                raise
    if last_error is not None:
        raise last_error
    raise RuntimeError("Failed to send transaction")


def submit_proof_to_registry(
    proof_hex: str,
    public_inputs_json: str,
    is_compliant: bool,
    total_collateral: int,
    total_debt: int,
    ratio_bps: int,
    agent_reasoning: str,
    trigger: int,
    request_id: int
) -> str:
    """
    Submit verified ZK proof to ComplianceRegistry on-chain.
    1. Verifies the proof via UltraVerifier.verify() (read call)
    2. Calls ComplianceRegistry.submitReport() with proof hash + LLM reasoning
    3. Waits for confirmation
    Returns: report_id, tx_hash, basescan_url, block_number.
    agent_reasoning is the Groq LLM text — stored on-chain forever.
    """
    if _is_dry_run():
        return json.dumps({"tx_hash": "0xDRY_RUN", "skipped": True})
    try:
        account = _get_account()
        proof_bytes = bytes.fromhex(proof_hex.replace("0x", "")) if proof_hex != "0x00" else b"\x00"
        public_inputs = [bytes.fromhex(x.replace("0x", "")).ljust(32, b"\x00")[:32] for x in json.loads(public_inputs_json)]

        # Step 1: Verify proof on-chain (read call — free).
        # Retry once on transient errors before recording as non-compliant.
        verified = False
        verify_error = None
        for attempt in range(2):
            try:
                verified = verifier.functions.verify(proof_bytes, public_inputs).call()
                verify_error = None
                break
            except Exception as e:
                verify_error = str(e)
                if attempt == 0:
                    log.warning(f"  [Verifier] Attempt 1 failed: {e} — retrying...")
                else:
                    log.error(
                        f"  [Verifier] Both attempts failed: {e}. "
                        "Recording as non-compliant to preserve honesty."
                    )
                    verified = False

        block_num  = w3.eth.block_number

        fn = registry.functions.submitReport(
            proof_bytes,
            public_inputs,
            0,                # proofType = COLLATERAL
            trigger,          # 0=routine, 1=urgent, 2=regulator_request
            block_num,
            verified,
            total_collateral,
            total_debt,
            "US-GENIUS-ACT",
            agent_reasoning,
            request_id,
        )
        tx_hash = _send_tx(fn, account)
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        tx_hash_0x = _with_0x(tx_hash)

        return json.dumps({
            "report_id":         "see logs",
            "tx_hash":           tx_hash_0x,
            "basescan_url":      f"https://sepolia.basescan.org/tx/{tx_hash_0x}",
            "block_number":      receipt["blockNumber"],
            "verified_on_chain": verified,
            "verify_error":      verify_error,  # None if verifier call succeeded
        })
    except Exception as e:
        return json.dumps({"error": str(e)})


def fulfill_regulator_request(
    request_id: int,
    proof_hex: str,
    public_inputs_json: str,
    agent_reasoning: str
) -> str:
    """
    Fulfill a pending RegulatorPortal compliance request on-chain.
    Calls RegulatorPortal.fulfillRequest() — stores agent reasoning permanently.
    The regulator can read this LLM text from the chain forever.
    """
    if _is_dry_run():
        return json.dumps({"tx_hash": "0xDRY_RUN", "request_id": request_id, "skipped": True})
    try:
        account = _get_account()
        proof_bytes    = bytes.fromhex(proof_hex.replace("0x", ""))
        public_inputs  = [bytes.fromhex(x.replace("0x", "")).ljust(32, b"\x00")[:32] for x in json.loads(public_inputs_json)]

        fn      = portal.functions.fulfillRequest(request_id, proof_bytes, public_inputs, agent_reasoning)
        tx_hash = _send_tx(fn, account)
        tx_hash_0x = _with_0x(tx_hash)

        return json.dumps({
            "tx_hash":        tx_hash_0x,
            "basescan_url":   f"https://sepolia.basescan.org/tx/{tx_hash_0x}",
            "request_id":     request_id,
            "status":         "fulfilled",
        })
    except Exception as e:
        return json.dumps({"error": str(e)})
