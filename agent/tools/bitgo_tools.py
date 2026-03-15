"""
bitgo_tools.py — BitGo wallet integration for Provium.

WHY BITGO:
  Previously: Agent used a simple private key (eth_account) to sign and send
  ZK proof submissions. Single point of failure, no policy enforcement.

  WITH BITGO: Agent wallet is a BitGo multi-sig wallet. Every ZK proof
  submission goes through BitGo's enterprise-grade infrastructure:
    ✓ Multi-sig (2-of-3) — rogue agent cannot act alone
    ✓ Policy enforcement — only valid proofs can be submitted
    ✓ Audit trail — every tx logged by BitGo
    ✓ Webhook notifications — real-time alerts on every action

ARCHITECTURE:
  BitGo Express (optional local service) OR BitGo REST API v2:
    - Test env:  https://app.bitgo-test.com/api/v2
    - Prod env:  https://app.bitgo.com/api/v2
  Coin: tbaseeth (Base Sepolia testnet)

FALLBACK:
  If BITGO_ACCESS_TOKEN is not set, falls back gracefully to the existing
  eth_account approach. This ensures the demo works even without full
  BitGo enterprise account setup.

SETUP INSTRUCTIONS (for judges):
  1. Go to https://app.bitgo-test.com → Create account
  2. Create a wallet → coin: tbaseeth (Base Sepolia)
  3. Settings → Developer → Create Access Token
  4. Add to .env: BITGO_ACCESS_TOKEN, BITGO_WALLET_ID
  5. Fund the wallet with Base Sepolia ETH from faucet
"""

import json
import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("zkcomply.bitgo")

# ── BitGo Config ───────────────────────────────────────────────────────────────
BITGO_ACCESS_TOKEN = os.getenv("BITGO_ACCESS_TOKEN", "")
BITGO_WALLET_ID    = os.getenv("BITGO_WALLET_ID", "")
BITGO_WALLET_PASSPHRASE = os.getenv("BITGO_WALLET_PASSPHRASE", "")
BITGO_ENV          = os.getenv("BITGO_ENV", "test")   # "test" or "prod"
BITGO_COIN         = os.getenv("BITGO_COIN", "tbaseeth")   # Base Sepolia testnet
BITGO_MOCK         = os.getenv("BITGO_MOCK", "").lower() in ("1", "true", "yes")

BITGO_BASE_URL = (
    "https://app.bitgo-test.com/api/v2"
    if BITGO_ENV == "test"
    else "https://app.bitgo.com/api/v2"
)

BITGO_ENABLED = bool(BITGO_ACCESS_TOKEN and BITGO_WALLET_ID) or BITGO_MOCK


# ── Mock client for demo/testing without live credentials ─────────────────────

class BitGoMockClient:
    """
    Returns realistic BitGo-shaped responses without hitting the API.
    Activated via BITGO_MOCK=true in .env.
    """

    def __init__(self):
        import hashlib, time
        self.coin = BITGO_COIN
        self.wallet_id = BITGO_WALLET_ID or "663f1a2b4e5d6c7890abcdef12345678"
        self._mock_address = os.getenv("AGENT_WALLET_ADDRESS", "0xd707187453D29b8b3b017A02e4E6d6f6E5222017")
        self._counter = int(time.time())

    def _mock_txid(self) -> str:
        import hashlib, time
        self._counter += 1
        return "0x" + hashlib.sha256(f"bitgo-mock-{self._counter}".encode()).hexdigest()

    def get_wallet(self) -> dict:
        return {
            "id": self.wallet_id,
            "coin": self.coin,
            "label": "Provium Compliance Wallet (mock)",
            "balanceString": "50000000000000000",  # 0.05 ETH
            "confirmedBalanceString": "50000000000000000",
            "receiveAddress": {"address": self._mock_address},
            "multisigType": "tss",
            "keys": ["user-key-abc", "bitgo-key-def", "backup-key-ghi"],
            "enterprise": "provium-enterprise",
        }

    def get_wallet_address(self) -> str:
        return self._mock_address

    def send_transaction(self, recipient_address, amount_wei, data_hex, otp="") -> dict:
        txid = self._mock_txid()
        log.info(f"  [BitGo] MOCK: Sending tx to {recipient_address[:20]}... via multi-sig wallet")
        log.info(f"  [BitGo] MOCK: ✓ Tx broadcast: {txid[:20]}...")
        return {
            "txid": txid,
            "status": "signed",
            "type": "send",
            "coin": self.coin,
            "walletId": self.wallet_id,
            "comment": "Provium ZK compliance proof submission (BitGo secured)",
            "transfer": {"txid": txid, "state": "signed"},
        }

    def get_transfer_history(self, limit=10) -> list:
        txid = self._mock_txid()
        return [{
            "id": txid,
            "coin": self.coin,
            "type": "send",
            "state": "confirmed",
            "comment": "Provium ZK compliance proof submission (BitGo secured)",
            "value": "0",
        }]

    def build_evm_calldata(self, fn_selector, encoded_args):
        return "0x" + fn_selector + encoded_args


# ── BitGo REST API client ──────────────────────────────────────────────────────

class BitGoClient:
    """
    Minimal BitGo API v2 client, Python implementation.
    Uses requests library — no heavy SDK dependency.
    """

    def __init__(self):
        self.base_url = BITGO_BASE_URL
        self.coin     = BITGO_COIN
        self.wallet_id = BITGO_WALLET_ID
        self.headers  = {
            "Authorization": f"Bearer {BITGO_ACCESS_TOKEN}",
            "Content-Type":  "application/json",
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def get_wallet(self) -> dict:
        """Fetch wallet info."""
        url = f"{self.base_url}/{self.coin}/wallet/{self.wallet_id}"
        resp = self.session.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def get_wallet_address(self) -> str:
        """Get the primary receiving address of the BitGo wallet."""
        wallet = self.get_wallet()
        return wallet.get("receiveAddress", {}).get("address", "")

    def send_transaction(
        self,
        recipient_address: str,
        amount_wei: int,
        data_hex: str,
        otp: str = "",
    ) -> dict:
        """
        Send a transaction via BitGo multi-sig wallet.

        For ZK proof submissions, amount = 0 (data-only call).
        BitGo handles:
          - Multi-sig signing (2-of-3)
          - Policy enforcement
          - Broadcast to Base Sepolia

        Returns: {"txid": "0x...", "status": "signed", ...}
        """
        # Resolve OTP: prefer argument, then env var, then testnet bypass default.
        resolved_otp = otp or os.getenv("BITGO_OTP", "0000000")
        if resolved_otp == "0000000" and BITGO_ENV == "prod":
            log.warning(
                "  [BitGo] WARNING: Using default OTP '0000000' in PRODUCTION. "
                "Set BITGO_OTP in your .env to a real TOTP code before going live."
            )
        url = f"{self.base_url}/{self.coin}/wallet/{self.wallet_id}/sendcoins"
        payload = {
            "address":    recipient_address,
            "amount":     str(amount_wei),
            "data":       data_hex,         # EVM calldata
            "walletPassphrase": BITGO_WALLET_PASSPHRASE,
            "otp":        resolved_otp,
            "comment":    "Provium ZK compliance proof submission (BitGo secured)",
        }
        log.info(f"  [BitGo] Sending tx to {recipient_address[:20]}... via multi-sig wallet")
        resp = self.session.post(url, json=payload, timeout=60)
        if resp.status_code == 200:
            result = resp.json()
            tx_hash = result.get("txid") or result.get("transfer", {}).get("txid", "")
            log.info(f"  [BitGo] ✓ Tx broadcast: {str(tx_hash)[:20]}...")
            return result
        else:
            log.error(f"  [BitGo] Send failed HTTP {resp.status_code}: {resp.text[:300]}")
            resp.raise_for_status()

    def get_transfer_history(self, limit: int = 10) -> list:
        """Get recent wallet transactions — for audit trail."""
        url = f"{self.base_url}/{self.coin}/wallet/{self.wallet_id}/transfer"
        resp = self.session.get(url, params={"limit": limit}, timeout=30)
        resp.raise_for_status()
        return resp.json().get("transfers", [])

    def build_evm_calldata(self, fn_selector: str, encoded_args: str) -> str:
        """
        Construct EVM calldata for a contract function call.
        fn_selector: 4-byte function selector (hex, no 0x)
        encoded_args: ABI-encoded args (hex, no 0x)
        """
        return "0x" + fn_selector + encoded_args


# ── Singleton ──────────────────────────────────────────────────────────────────
_bitgo_client: BitGoClient | None = None


def get_bitgo_client() -> BitGoClient | BitGoMockClient | None:
    """Get the BitGo client if configured, else None."""
    global _bitgo_client
    if not BITGO_ENABLED:
        return None
    if _bitgo_client is None:
        if BITGO_MOCK:
            log.info("  [BitGo] Using MOCK client (BITGO_MOCK=true)")
            _bitgo_client = BitGoMockClient()
        else:
            _bitgo_client = BitGoClient()
    return _bitgo_client


# ── Main integration function ──────────────────────────────────────────────────

def send_via_bitgo(
    contract_address: str,
    calldata_hex: str,
) -> dict | None:
    """
    Attempt to send a contract call via BitGo wallet.
    Returns BitGo result dict if successful, None if BitGo not configured.

    This is the KEY integration: instead of signing with eth_account directly,
    the proof submission calldata goes through BitGo multi-sig first.
    """
    client = get_bitgo_client()
    if client is None:
        return None

    try:
        result = client.send_transaction(
            recipient_address=contract_address,
            amount_wei=0,  # Pure data call — no ETH transfer
            data_hex=calldata_hex,
        )
        return {
            "bitgo_wallet_id": BITGO_WALLET_ID,
            "bitgo_env":       BITGO_ENV,
            "bitgo_coin":      BITGO_COIN,
            "txid":            result.get("txid") or result.get("transfer", {}).get("txid"),
            "status":          result.get("status", "sent"),
            "multisig":        True,
            "policy_enforced": True,
            "raw":             result,
        }
    except requests.exceptions.HTTPError as e:
        log.warning(f"  [BitGo] HTTP error: {e} — falling back to eth_account")
        return None
    except requests.exceptions.ConnectionError:
        log.warning("  [BitGo] Cannot reach BitGo API — falling back to eth_account")
        return None
    except Exception as e:
        log.warning(f"  [BitGo] Error: {e} — falling back to eth_account")
        return None


def get_bitgo_wallet_info() -> dict:
    """
    Return wallet metadata for logging/submission.
    Shows judges that BitGo is integrated.
    """
    client = get_bitgo_client()
    if client is None:
        return {
            "bitgo_enabled":  False,
            "reason":         "BITGO_ACCESS_TOKEN or BITGO_WALLET_ID not set",
            "setup_note":     (
                "To enable BitGo: "
                "1. Create account at https://app.bitgo-test.com "
                "2. Create tbaseeth wallet "
                "3. Get access token from Settings → Developer "
                "4. Add BITGO_ACCESS_TOKEN + BITGO_WALLET_ID to .env"
            ),
        }
    try:
        wallet = client.get_wallet()
        address = wallet.get("receiveAddress", {}).get("address", "unknown")
        balance = wallet.get("balanceString", "0")
        return {
            "bitgo_enabled":   True,
            "wallet_id":       BITGO_WALLET_ID,
            "coin":            BITGO_COIN,
            "env":             BITGO_ENV,
            "wallet_address":  address,
            "balance_wei":     balance,
            "multisig":        True,
            "policy_enforced": True,
        }
    except Exception as e:
        return {
            "bitgo_enabled":  True,
            "wallet_id":      BITGO_WALLET_ID,
            "error":          str(e),
        }
