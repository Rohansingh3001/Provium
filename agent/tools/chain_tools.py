"""
chain_tools.py — Real web3.py reads from Base Sepolia contracts.
Loads addresses from deployments JSON and ABIs from artifact files.
"""
import json
import os
import time
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv
from agno.tools import tool
from cache import chain_cache

load_dotenv()

def _is_dry_run() -> bool:
    return os.getenv("ZKCOMPLY_DRY_RUN", "") == "1"

# ── Config ──────────────────────────────────────────────────────────────────
RPC = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
DEPLOYMENTS = Path(os.getenv("DEPLOYMENTS_PATH", "../contracts/deployments/base-sepolia.json"))

w3 = Web3(Web3.HTTPProvider(RPC))

try:
    cfg = json.loads(DEPLOYMENTS.read_text())
    LENDING_ADDR = Web3.to_checksum_address(cfg["LendingProtocol"])
    PORTAL_ADDR  = Web3.to_checksum_address(cfg["RegulatorPortal"])
    REGISTRY_ADDR = Web3.to_checksum_address(cfg["ComplianceRegistry"])
except Exception as e:
    print(f"WARNING: Could not load deployments: {e}. Using zero addresses.")
    LENDING_ADDR = PORTAL_ADDR = REGISTRY_ADDR = "0x0000000000000000000000000000000000000000"

# ── Minimal ABIs (only functions we call) ────────────────────────────────────
LENDING_ABI = [
    {"inputs": [], "name": "getUserCount", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "i", "type": "uint256"}], "name": "getUserAtIndex", "outputs": [{"type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "user", "type": "address"}], "name": "getPosition", "outputs": [{"name": "", "type": "uint256"}, {"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "user", "type": "address"}], "name": "getHealthFactor", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getTotalCollateral", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getTotalDebt", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "currentPositionRoot", "outputs": [{"type": "bytes32"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "positionRootBlock", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
]

PORTAL_ABI = [
    {"inputs": [], "name": "getPendingRequests", "outputs": [{"components": [
        {"name": "requestId", "type": "uint256"}, {"name": "requestor", "type": "address"},
        {"name": "proofType", "type": "uint8"}, {"name": "targetBlock", "type": "uint256"},
        {"name": "jurisdiction", "type": "string"}, {"name": "requestedAt", "type": "uint256"},
        {"name": "deadline", "type": "uint256"}, {"name": "fulfilled", "type": "bool"},
        {"name": "fulfilledAt", "type": "uint256"}, {"name": "proofHash", "type": "bytes32"},
        {"name": "agentReasoning", "type": "string"},
    ], "internalType": "struct RegulatorPortal.ComplianceRequest[]", "type": "tuple[]"}], "stateMutability": "view", "type": "function"},
]

REGISTRY_ABI = [
    {"inputs": [], "name": "getLatestReport", "outputs": [{"components": [
        {"name": "reportId", "type": "uint256"}, {"name": "proofType", "type": "uint8"},
        {"name": "trigger", "type": "uint8"}, {"name": "blockNumber", "type": "uint256"},
        {"name": "proofHash", "type": "bytes32"}, {"name": "isCompliant", "type": "bool"},
        {"name": "totalCollateral", "type": "uint256"}, {"name": "totalDebt", "type": "uint256"},
        {"name": "ratioBps", "type": "uint256"}, {"name": "jurisdiction", "type": "string"},
        {"name": "agentReasoning", "type": "string"}, {"name": "timestamp", "type": "uint256"},
        {"name": "agentAddress", "type": "address"}, {"name": "requestId", "type": "uint256"},
    ], "type": "tuple"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getReportCount", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
]

lending  = w3.eth.contract(address=LENDING_ADDR, abi=LENDING_ABI)
portal   = w3.eth.contract(address=PORTAL_ADDR,  abi=PORTAL_ABI)
registry = w3.eth.contract(address=REGISTRY_ADDR, abi=REGISTRY_ABI)

# Testnet price assumption: 1 WETH = 2000 USDC.
# PRODUCTION: replace with a live Chainlink ETH/USD read from
# 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70 (Base Sepolia ETH/USD feed).
WETH_PRICE_USDC = 2000


# ── Tools ────────────────────────────────────────────────────────────────────

@tool
def get_all_positions() -> str:
    """
    Fetch all user positions from LendingProtocol on Base Sepolia.
    Returns JSON with positions list, health factors, totals, current block.
    Called by Watcher agent every epoch.
    """
    _CACHE_KEY = "get_all_positions"
    cached = chain_cache.get(_CACHE_KEY)
    if cached is not None:
        return cached

    try:
        count = lending.functions.getUserCount().call()
        positions = []
        for i in range(count):
            addr  = lending.functions.getUserAtIndex(i).call()
            coll, debt = lending.functions.getPosition(addr).call()
            hf    = lending.functions.getHealthFactor(addr).call()
            positions.append({
                "address":  addr,
                "collateral_wei": str(coll),
                "collateral_eth": coll / 1e18,
                "debt_usdc6": str(debt),
                "debt_usdc": debt / 1e6,
                "health_factor_bps": hf,
                "health_factor_pct": hf / 100 if hf < 2**255 else 999999,
            })

        total_coll = lending.functions.getTotalCollateral().call()
        total_debt = lending.functions.getTotalDebt().call()
        ratio_bps  = int(total_coll * WETH_PRICE_USDC * 1e6 * 10000 / (total_debt * 1e18)) if total_debt else 999999

        result = json.dumps({
            "block": w3.eth.block_number,
            "user_count": count,
            "positions": positions,
            "total_collateral_eth": total_coll / 1e18,
            "total_debt_usdc": total_debt / 1e6,
            "aggregate_ratio_bps": ratio_bps,
            "aggregate_ratio_pct": ratio_bps / 100,
            "min_health_factor_bps": min((p["health_factor_bps"] for p in positions), default=999999),
        })
        chain_cache.set(_CACHE_KEY, result, expire=30)  # 30s TTL — one block time
        return result
    except Exception as e:
        return json.dumps({"error": str(e), "block": w3.eth.block_number})


@tool
def get_pending_regulator_requests() -> str:
    """
    Fetch all unfulfilled compliance requests from RegulatorPortal.
    Returns JSON array of pending requests with deadlines.
    """
    _CACHE_KEY = "get_pending_regulator_requests"
    cached = chain_cache.get(_CACHE_KEY)
    if cached is not None:
        return cached

    try:
        reqs = portal.functions.getPendingRequests().call()
        now  = int(time.time())
        result = json.dumps([{
            "requestId":   r[0],
            "requestor":   r[1],
            "proofType":   r[2],
            "targetBlock": r[3],
            "jurisdiction": r[4],
            "requestedAt":  r[5],
            "deadline":     r[6],
            "seconds_until_deadline": max(0, r[6] - now),
        } for r in reqs])
        chain_cache.set(_CACHE_KEY, result, expire=15)  # 15s TTL — regulator requests are time-sensitive
        return result
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_latest_compliance_report() -> str:
    """
    Get the most recent compliance report from ComplianceRegistry.
    Returns report details and how many hours since last proof.
    """
    try:
        count = registry.functions.getReportCount().call()
        if count == 0:
            return json.dumps({"hours_since_last_proof": 999, "isCompliant": True, "report_count": 0})
        r = registry.functions.getLatestReport().call()
        hours_since = (int(time.time()) - r[11]) / 3600
        return json.dumps({
            "report_id": r[0], "is_compliant": r[5],
            "ratio_bps": r[8], "ratio_pct": r[8] / 100,
            "jurisdiction": r[9], "agent_reasoning": r[10],
            "timestamp": r[11], "block_number": r[3],
            "hours_since_last_proof": round(hours_since, 2),
            "report_count": count,
        })
    except Exception as e:
        return json.dumps({"error": str(e), "hours_since_last_proof": 999})


@tool
def get_current_position_root() -> str:
    """
    Get the currently committed Merkle root from LendingProtocol.
    Returns root hash (hex) and block number it was committed at.
    """
    try:
        root  = lending.functions.currentPositionRoot().call()
        block = lending.functions.positionRootBlock().call()
        return json.dumps({"root": "0x" + root.hex(), "block": block})
    except Exception as e:
        return json.dumps({"error": str(e)})
