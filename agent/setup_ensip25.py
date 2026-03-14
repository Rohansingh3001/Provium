"""
setup_ensip25.py — Register ENS name on Sepolia + set ENSIP-25 text record.

This script:
  1. Checks Sepolia ETH balance
  2. Registers <name>.eth on Sepolia ENS (ETHRegistrarController v3 — tuple ABI)
  3. Sets the ENSIP-25 text record on the PublicResolver
  4. Verifies the text record resolves correctly

Run:
  cd agent && source venv/bin/activate
  python setup_ensip25.py
"""

import os
import sys
import time
import json
from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

SEPOLIA_RPC = os.getenv("SEPOLIA_RPC", "https://1rpc.io/sepolia")
PRIVATE_KEY = os.getenv("AGENT_PRIVATE_KEY", "")
ENS_NAME = os.getenv("ENS_NAME", "provium-agent")  # without .eth
DURATION = 365 * 24 * 60 * 60  # 1 year in seconds

# ENS Sepolia contracts (from ensdomains/ens-contracts deployments/sepolia/)
ETH_REGISTRAR_CONTROLLER = "0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968"
PUBLIC_RESOLVER = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5"

# ENSIP-25 config
COMPLIANCE_REGISTRY = "0xFbE3F85Ab541Cd538542B543E87706D00e1f7013"
AGENT_ID = "1"
CHAIN_ID_REGISTRY = 84532  # Base Sepolia (where ComplianceRegistry lives)

# ── ABIs ──────────────────────────────────────────────────────────────────────
# ENS v3 uses Registration struct: (label, owner, duration, secret, resolver, data[], reverseRecord, referrer)

REGISTRATION_TUPLE = {
    "components": [
        {"name": "label", "type": "string"},
        {"name": "owner", "type": "address"},
        {"name": "duration", "type": "uint256"},
        {"name": "secret", "type": "bytes32"},
        {"name": "resolver", "type": "address"},
        {"name": "data", "type": "bytes[]"},
        {"name": "reverseRecord", "type": "uint8"},
        {"name": "referrer", "type": "bytes32"},
    ],
    "name": "registration",
    "type": "tuple",
}

CONTROLLER_ABI = [
    {
        "inputs": [{"type": "string", "name": "label"}],
        "name": "available",
        "outputs": [{"type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [REGISTRATION_TUPLE],
        "name": "makeCommitment",
        "outputs": [{"type": "bytes32", "name": "commitment"}],
        "stateMutability": "pure",
        "type": "function",
    },
    {
        "inputs": [{"type": "bytes32", "name": "commitment"}],
        "name": "commit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [REGISTRATION_TUPLE],
        "name": "register",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [
            {"type": "string", "name": "label"},
            {"type": "uint256", "name": "duration"},
        ],
        "name": "rentPrice",
        "outputs": [
            {
                "type": "tuple",
                "name": "price",
                "components": [
                    {"type": "uint256", "name": "base"},
                    {"type": "uint256", "name": "premium"},
                ],
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "minCommitmentAge",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

RESOLVER_ABI = [
    {
        "inputs": [
            {"type": "bytes32", "name": "node"},
            {"type": "string", "name": "key"},
            {"type": "string", "name": "value"},
        ],
        "name": "setText",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"type": "bytes32", "name": "node"},
            {"type": "string", "name": "key"},
        ],
        "name": "text",
        "outputs": [{"type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def namehash(name: str) -> bytes:
    """Compute ENS namehash."""
    if not name:
        return b'\x00' * 32
    label, _, remainder = name.partition('.')
    return Web3.solidity_keccak(
        ['bytes32', 'bytes32'],
        [namehash(remainder), Web3.solidity_keccak(['string'], [label])]
    )


def encode_erc7930(chain_id: int, address: str) -> str:
    """ERC-7930 interoperable address encoding."""
    addr = address.lower().replace('0x', '')
    chain_hex = hex(chain_id)[2:]
    if len(chain_hex) % 2:
        chain_hex = '0' + chain_hex
    chain_byte_len = len(chain_hex) // 2
    return '0x' + '0001' + '0000' + f'{chain_byte_len:02x}' + chain_hex + '14' + addr


def build_ensip25_key(registry: str, agent_id: str, chain_id: int) -> str:
    """Build the ENSIP-25 text record key."""
    erc7930 = encode_erc7930(chain_id, registry)
    return f"agent-registration[{erc7930}][{agent_id}]"


def build_registration_tuple(label, owner, duration, secret, resolver):
    """Build the Registration struct tuple for ENS v3."""
    return (
        label,                                  # string label
        Web3.to_checksum_address(owner),        # address owner
        duration,                               # uint256 duration
        secret,                                 # bytes32 secret
        Web3.to_checksum_address(resolver),     # address resolver
        [],                                     # bytes[] data
        0,                                      # uint8 reverseRecord (0 = false)
        b'\x00' * 32,                           # bytes32 referrer (none)
    )


def send_tx(w3, account, tx):
    """Sign and send a transaction, wait for receipt."""
    tx['nonce'] = w3.eth.get_transaction_count(account.address)
    tx['chainId'] = 11155111  # Sepolia
    if 'gas' not in tx:
        tx['gas'] = int(w3.eth.estimate_gas(tx) * 1.3)
    if 'maxFeePerGas' not in tx:
        base_fee = w3.eth.get_block('latest')['baseFeePerGas']
        tx['maxFeePerGas'] = base_fee * 3
        tx['maxPriorityFeePerGas'] = w3.to_wei(2, 'gwei')
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  Tx sent: {tx_hash.hex()}")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt['status'] != 1:
        raise RuntimeError(f"Tx reverted: {tx_hash.hex()}")
    print(f"  Confirmed in block {receipt['blockNumber']}")
    return receipt


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not PRIVATE_KEY:
        print("ERROR: AGENT_PRIVATE_KEY not set in .env")
        sys.exit(1)

    w3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC, request_kwargs={'timeout': 30}))
    if not w3.is_connected():
        print("ERROR: Cannot connect to Sepolia RPC")
        sys.exit(1)

    account = Account.from_key(PRIVATE_KEY)
    balance = w3.eth.get_balance(account.address)
    print(f"\n{'='*60}")
    print(f"  ENSIP-25 Setup — Sepolia Testnet")
    print(f"{'='*60}")
    print(f"  Wallet:  {account.address}")
    print(f"  Balance: {w3.from_wei(balance, 'ether'):.4f} Sepolia ETH")
    print(f"  Name:    {ENS_NAME}.eth")

    if balance < w3.to_wei(0.005, 'ether'):
        print("\nERROR: Need at least 0.005 Sepolia ETH. Get some from:")
        print("  https://www.alchemy.com/faucets/ethereum-sepolia")
        sys.exit(1)

    controller = w3.eth.contract(
        address=Web3.to_checksum_address(ETH_REGISTRAR_CONTROLLER),
        abi=CONTROLLER_ABI,
    )
    resolver = w3.eth.contract(
        address=Web3.to_checksum_address(PUBLIC_RESOLVER),
        abi=RESOLVER_ABI,
    )

    # ── Step 1: Check availability ────────────────────────────────────────
    print(f"\n[Step 1] Checking if '{ENS_NAME}.eth' is available...")
    available = controller.functions.available(ENS_NAME).call()
    if available:
        print(f"  '{ENS_NAME}.eth' is AVAILABLE")
    else:
        print(f"  '{ENS_NAME}.eth' is already registered — skipping to text record setup")
        return set_text_record(w3, account, resolver)

    # ── Step 2: Commit (anti-frontrunning) ─────────────────────────────────
    print(f"\n[Step 2] Making commitment (anti-frontrunning)...")
    secret = os.urandom(32)
    reg_tuple = build_registration_tuple(
        ENS_NAME, account.address, DURATION, secret, PUBLIC_RESOLVER
    )
    commitment = controller.functions.makeCommitment(reg_tuple).call()
    print(f"  Commitment: {commitment.hex()}")

    tx = controller.functions.commit(commitment).build_transaction({
        'from': account.address,
        'value': 0,
    })
    send_tx(w3, account, tx)

    # ── Step 3: Wait + Register ────────────────────────────────────────────
    min_age = controller.functions.minCommitmentAge().call()
    wait_time = min_age + 5  # add 5s buffer
    print(f"\n[Step 3] Waiting {wait_time}s (minCommitmentAge={min_age}s + buffer)...")
    for i in range(wait_time, 0, -5):
        print(f"  {i}s remaining...", end='\r')
        time.sleep(5)
    print(f"  Done waiting.       ")

    print(f"\n[Step 3b] Registering '{ENS_NAME}.eth'...")
    price = controller.functions.rentPrice(ENS_NAME, DURATION).call()
    total_price = price[0] + price[1]  # base + premium
    value = int(total_price * 1.2)  # 20% buffer
    print(f"  Price: {w3.from_wei(total_price, 'ether'):.6f} ETH (sending {w3.from_wei(value, 'ether'):.6f})")

    tx = controller.functions.register(reg_tuple).build_transaction({
        'from': account.address,
        'value': value,
    })
    send_tx(w3, account, tx)
    print(f"  '{ENS_NAME}.eth' registered!")

    # ── Step 4: Set ENSIP-25 text record ──────────────────────────────────
    set_text_record(w3, account, resolver)


def set_text_record(w3, account, resolver):
    """Set the ENSIP-25 text record on the resolver."""
    print(f"\n[Step 4] Setting ENSIP-25 text record...")

    text_key = build_ensip25_key(COMPLIANCE_REGISTRY, AGENT_ID, CHAIN_ID_REGISTRY)
    text_value = "1"
    node = namehash(f"{ENS_NAME}.eth")

    print(f"  Node:  {node.hex()}")
    print(f"  Key:   {text_key}")
    print(f"  Value: {text_value}")

    tx = resolver.functions.setText(
        node,
        text_key,
        text_value,
    ).build_transaction({
        'from': account.address,
        'value': 0,
    })
    send_tx(w3, account, tx)

    # ── Step 5: Verify ────────────────────────────────────────────────────
    print(f"\n[Step 5] Verifying text record...")
    time.sleep(3)
    result = resolver.functions.text(node, text_key).call()
    if result and result.strip():
        print(f"  VERIFIED! Value = '{result}'")
        print(f"\n{'='*60}")
        print(f"  ENSIP-25 is LIVE on Sepolia!")
        print(f"  ENS name:  {ENS_NAME}.eth")
        print(f"  Text key:  {text_key}")
        print(f"  Value:     {result}")
        print(f"  Dashboard: Badge will show VERIFIED")
        print(f"{'='*60}\n")
    else:
        print(f"  WARNING: Text record not found yet. May take a moment to propagate.")


if __name__ == "__main__":
    main()
