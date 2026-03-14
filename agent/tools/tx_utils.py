"""
tx_utils.py — Shared transaction helpers for proof_tools and submit_tools.

Fixes:
  L2: Agent private key loaded on-demand (not at module level as a plain string).
  H5: Explicit gas limit on all transactions.
  H6: EIP-1559 gas pricing (maxFeePerGas / maxPriorityFeePerGas) instead of
      legacy gasPrice, which overpays on Base Sepolia.
"""
import os
from web3 import Web3
from eth_account import Account
from eth_account.signers.local import LocalAccount

# Hard upper bound on gas per transaction.
TX_GAS_LIMIT = 500_000


def _get_account() -> LocalAccount:
    """
    Load the agent signing account from the environment on-demand.
    Avoids holding the private key as a module-level string for the
    lifetime of the process.
    """
    key = os.getenv("AGENT_PRIVATE_KEY", "")
    if not key:
        raise RuntimeError(
            "AGENT_PRIVATE_KEY is not set. "
            "Add it to your .env file before running the agent."
        )
    return Account.from_key(key)


def _eip1559_params(w3: Web3) -> dict:
    """
    Return EIP-1559 gas parameters for build_transaction().
    Uses the latest base fee + a 1 gwei priority tip, with 2x base-fee
    headroom to survive fee spikes within the 90-second receipt timeout.

    Falls back to legacy gasPrice if the RPC does not support fee_history.
    """
    try:
        fee_history = w3.eth.fee_history(1, "latest", [50])
        base_fee = fee_history["baseFeePerGas"][-1]
        priority = w3.to_wei(1, "gwei")
        return {
            "maxFeePerGas": base_fee * 2 + priority,
            "maxPriorityFeePerGas": priority,
            "gas": TX_GAS_LIMIT,
        }
    except Exception:
        # Fallback for RPCs that don't support EIP-1559 fee history.
        return {
            "gasPrice": w3.eth.gas_price,
            "gas": TX_GAS_LIMIT,
        }
