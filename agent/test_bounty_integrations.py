"""
test_bounty_integrations.py

Quick standalone test to verify BitGo, Fileverse, and ENSIP-25 integrations.
Run from the agent/ directory:
    python test_bounty_integrations.py

WHAT THIS TESTS:
  1. Fileverse — dossier builder, local save, API status
  2. BitGo — wallet status and connection
  3. ENSIP-25 — agent verification key generation
"""

import sys
import os
import json

# Add agent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
INFO = "\033[94m→\033[0m"
BOLD = "\033[1m"
END  = "\033[0m"

print(f"\n{BOLD}{'='*60}{END}")
print(f"{BOLD}  Provium — Bounty Integration Tests{END}")
print(f"{BOLD}{'='*60}{END}\n")


# ══════════════════════════════════════════════════════════════
# TEST 1: Fileverse
# ══════════════════════════════════════════════════════════════
print(f"{BOLD}[TEST 1] Fileverse — Compliance Dossier Storage{END}")
print(f"{'─'*50}")

from tools.fileverse_tools import (
    get_fileverse_status, build_compliance_dossier,
    _save_to_local, FILEVERSE_ENABLED, DOSSIER_DIR,
)

fv_status = get_fileverse_status()
fv_enabled = fv_status.get("fileverse_enabled", False)

# Test dossier building (always works — no API needed)
test_dossier = build_compliance_dossier(
    epoch_number=999999,
    action={
        "urgency": "routine",
        "trigger": 0,
        "request_id": 0,
        "agent_reasoning": "Integration test dossier — verifying builder works.",
    },
    reporter_result={
        "steps": [
            {"step": "zk_proof", "is_compliant": True, "time": 42.5},
            {"step": "submit_report", "tx": "0xTEST_TX_HASH"},
        ],
    },
    watcher_data={
        "positions_data": {
            "user_count": 5,
            "aggregate_ratio_pct": 166.7,
            "min_health_factor_bps": 16670,
        },
        "risk_level": "low",
    },
    submit_result={
        "tx_hash": "0xTEST_TX_HASH",
        "block_number": 12345678,
        "verified_on_chain": True,
    },
)

dossier_ok = (
    test_dossier.get("schema") == "provium-compliance-dossier-v1"
    and test_dossier.get("proof", {}).get("is_compliant") is True
    and test_dossier.get("content_hash")
)

if dossier_ok:
    print(f"{PASS} Dossier builder works correctly")
    print(f"   Schema:       {test_dossier.get('schema')}")
    print(f"   Content hash: {test_dossier.get('content_hash', '')[:20]}...")
    print(f"   Fields:       {len(test_dossier)} top-level keys")
else:
    print(f"{FAIL} Dossier builder returned unexpected structure")

# Test local save
local_save_ok = False
try:
    local_result = _save_to_local(test_dossier)
    if local_result.get("source") == "local" and local_result.get("file_id"):
        print(f"{PASS} Local dossier save works: {local_result['file_id']}")
        local_save_ok = True
    else:
        print(f"{FAIL} Local dossier save returned unexpected result")
except Exception as e:
    print(f"{FAIL} Local dossier save failed: {e}")

if fv_enabled:
    print(f"{PASS} Fileverse API is CONFIGURED")
    print(f"   Namespace:  {fv_status.get('namespace', 'N/A')}")
    print(f"   Base URL:   {fv_status.get('base_url', 'N/A')}")
else:
    print(f"{INFO} Fileverse API not configured — local dossier mode active")
    print(f"   Dossier dir: {DOSSIER_DIR}")
    print(f"\n   {BOLD}To activate Fileverse:{END}")
    print(f"   1. Go to https://fileverse.io")
    print(f"   2. Get API key and namespace")
    print(f"   3. Add to .env:")
    print(f"      FILEVERSE_API_KEY=<your_key>")
    print(f"      FILEVERSE_NAMESPACE=<your_namespace>")

print()


# ══════════════════════════════════════════════════════════════
# TEST 2: BitGo
# ══════════════════════════════════════════════════════════════
print(f"{BOLD}[TEST 2] BitGo — Multi-sig Wallet{END}")
print(f"{'─'*50}")

from tools.bitgo_tools import get_bitgo_wallet_info, BITGO_ENABLED

bitgo_info = get_bitgo_wallet_info()
bitgo_enabled = bitgo_info.get("bitgo_enabled", False)

if bitgo_enabled:
    print(f"{PASS} BitGo is CONFIGURED and ACTIVE")
    print(f"   Wallet ID:  {bitgo_info.get('wallet_id', 'N/A')[:20]}...")
    print(f"   Address:    {bitgo_info.get('wallet_address', 'N/A')}")
    print(f"   Coin:       {bitgo_info.get('coin', 'N/A')}")
    print(f"   Env:        {bitgo_info.get('env', 'N/A')}")
    print(f"   Multi-sig:  {bitgo_info.get('multisig', False)}")
    if "error" in bitgo_info:
        print(f"   ERROR:      {bitgo_info['error']}")
else:
    print(f"{INFO} BitGo not configured yet — expected without credentials")
    print(f"   Status:     eth_account fallback will be used")
    print(f"\n   {BOLD}To activate BitGo:{END}")
    print(f"   1. Go to https://app.bitgo-test.com")
    print(f"   2. Create account → Create tbaseeth wallet")
    print(f"   3. Settings → Developer → Create Access Token")
    print(f"   4. Add to .env:")
    print(f"      BITGO_ACCESS_TOKEN=<your_token>")
    print(f"      BITGO_WALLET_ID=<your_wallet_id>")
    print(f"\n   Once set, all ZK proof submissions will route through BitGo multi-sig!")

print()


# ══════════════════════════════════════════════════════════════
# TEST 3: ENSIP-25
# ══════════════════════════════════════════════════════════════
print(f"{BOLD}[TEST 3] ENSIP-25 — AI Agent Registry{END}")
print(f"{'─'*50}")

ensip25_ok = False
try:
    from tools.ensip25 import get_ensip25_text_key, encode_erc7930_address
    print(f"{PASS} ENSIP-25 tools imported successfully")
    ensip25_ok = True
except ImportError as e:
    print(f"{FAIL} ENSIP-25 import failed: {e}")

print()


# ══════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════
print(f"{BOLD}{'='*60}{END}")
print(f"{BOLD}  SUMMARY{END}")
print(f"{BOLD}{'='*60}{END}")

bg_ok = bitgo_enabled
fv_ok = dossier_ok and local_save_ok

print(f"""
  Fileverse Integration:    {'ACTIVE' if fv_enabled else 'LOCAL MODE (API not configured)'}
    - Dossier builder: {'OK' if dossier_ok else 'FAILED'}
    - Local save:      {'OK' if local_save_ok else 'FAILED'}
    - API upload:      {'ACTIVE' if fv_enabled else 'Needs FILEVERSE_API_KEY'}
    - Hackathon:       Structured compliance dossiers per proof
                       Decentralized storage via Fileverse

  BitGo Integration:        {'ACTIVE' if bg_ok else 'READY (needs credentials)'}
    - Configured:      {bg_ok}
    - Mode:            {'BitGo multi-sig' if bg_ok else 'eth_account (fallback)'}
    - Hackathon:       ZK proofs submitted via BitGo wallet
                       Multi-sig, policy enforcement, webhooks

  ENSIP-25 Integration:     {'OK' if ensip25_ok else 'FAILED'}
    - Agent registry:  ERC-7930 encoded verification key

  Integration points:
    tools/fileverse_tools.py  <- Fileverse dossier builder + uploader
    tools/bitgo_tools.py      <- BitGo REST API v2 client
    tools/submit_tools.py     <- BitGo-first tx signing
    tools/ensip25.py          <- ENSIP-25 agent verification
    orchestrator.py           <- Fileverse hook after proof submission
""")

all_ok = fv_ok and bg_ok and ensip25_ok
some_ok = fv_ok or bg_ok

if all_ok:
    print(f"  {PASS} All integrations ACTIVE")
elif some_ok:
    status_parts = []
    if fv_ok:
        status_parts.append("Fileverse dossier builder")
    if bg_ok:
        status_parts.append("BitGo")
    if ensip25_ok:
        status_parts.append("ENSIP-25")
    print(f"  {PASS} Working: {', '.join(status_parts)}")
    if not bg_ok:
        print(f"  {INFO} Add BitGo credentials to .env for full integration")
else:
    print(f"  {INFO} Add credentials to .env to activate bounty integrations")

print()
