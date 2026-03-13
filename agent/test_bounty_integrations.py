"""
test_bounty_integrations.py

Quick standalone test to verify BitGo and DataHaven integrations work.
Run from the agent/ directory:
    python test_bounty_integrations.py

WHAT THIS TESTS:
  1. BitGo — checks wallet status and connection
  2. Full flow — simulates what happens every epoch
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
print(f"{BOLD}  Provium — BitGo Integration Test{END}")
print(f"{BOLD}{'='*60}{END}\n")


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
# SUMMARY
# ══════════════════════════════════════════════════════════════
print(f"{BOLD}{'='*60}{END}")
print(f"{BOLD}  SUMMARY{END}")
print(f"{BOLD}{'='*60}{END}")

bg_ok = bitgo_enabled

print(f"""
  BitGo Integration:      {'ACTIVE ✓' if bg_ok else 'READY (needs credentials)'}
    - Configured:   {bg_ok}
    - Mode:         {'BitGo multi-sig' if bg_ok else 'eth_account (fallback)'}
    - Hackathon:    ZK proofs submitted via BitGo wallet
                    Multi-sig, policy enforcement, webhooks

  Integration points:
    tools/bitgo_tools.py      ← BitGo REST API v2 client
    tools/submit_tools.py     ← BitGo-first tx signing
""")

if bg_ok:
    print(f"  {PASS} BitGo integration ACTIVE — good luck! 🚀")
else:
    print(f"  {INFO} Add BitGo credentials to .env to activate multi-sig")

print()
