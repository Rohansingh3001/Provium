"""
ensip25.py — ENSIP-25 AI Agent Registry ENS Name Verification for Provium.

ENSIP-25 (https://docs.ens.domains/ensip/25/) defines a standardized
mechanism to verify the association between an ENS name and an on-chain
AI agent registry entry, using parameterized ENS text records.

TEXT RECORD FORMAT:
  agent-registration[<registry>][<agentId>] = "1"

  Where:
    <registry> = ERC-7930 interoperable address of the AI agent registry
                 contract (our ComplianceRegistry on Base Sepolia)
    <agentId>  = the registry-defined agent identifier (e.g. "1" or the
                 agent's wallet address)

VERIFICATION FLOW (Registry → ENS):
  1. Obtain claimed ENS name + agentId + registry address from the registry
  2. Construct key: agent-registration[<registry>][<agentId>]
  3. Resolve the text record on the ENS name
  4. If non-empty → ENS name is verified for that agent entry

ERC-7930 ENCODING FOR EVM CHAINS:
  Format: 0x | 0001 (EIP-155 ns) | 0000 (reserved) | <chainIdLen:1B>
               | <chainId:NB big-endian> | 14 (addrLen=20) | <address:20B>

  Examples:
    Ethereum mainnet (chain 1):
      0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432
                        ^^-- chainLen=1, chainId=0x01 (=1)

    Base Sepolia (chain 84532 = 0x014A34):
      0x000100000301_4A34_14_<address>
               ^^-- chainLen=3, chainId=0x014A34 (=84532)

HOW PROVIUM USES ENSIP-25:
  The Provium compliance agent (provium-agent.eth) sets one text record on
  its ENS name to declare it is the registered agent in ComplianceRegistry.
  Any protocol or dApp can then:
    1. Read the text record from the ENS name
    2. Verify it matches the expected key pattern
    3. Trust that the on-chain agent is the rightful controller of that ENS name
  This creates a human-readable, cryptographically-backed identity for the
  autonomous compliance agent running via BitGo wallet infrastructure.
"""

import json
import logging
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("zkcomply.ensip25")

# ── ERC-7930 encoding ─────────────────────────────────────────────────────────

def encode_erc7930_address(chain_id: int, address: str) -> str:
    """
    Encode a contract address as an ERC-7930 interoperable address.

    Supports EIP-155 EVM chains (namespace = 0x0001).

    Encoding:
      0x0001 | 0000 | <chainIdLen> | <chainId_big_endian> | 0x14 | <address_20B>

    Args:
        chain_id: EIP-155 chain ID (e.g. 1 for mainnet, 84532 for Base Sepolia)
        address:  20-byte EVM address (with or without 0x prefix)

    Returns:
        Lowercase hex string starting with 0x, e.g.:
          "0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432"
    """
    addr_clean = address.lower().replace("0x", "")
    if len(addr_clean) != 40:
        raise ValueError(f"Expected 20-byte (40 hex char) address, got: {address}")

    addr_bytes = bytes.fromhex(addr_clean)

    # Encode chain ID as minimal big-endian (strip leading zero bytes, min 1 byte)
    chain_byte_len = (chain_id.bit_length() + 7) // 8 or 1
    chain_bytes = chain_id.to_bytes(chain_byte_len, "big")

    encoded = (
        bytes.fromhex("0001")           # EIP-155 namespace type
        + bytes.fromhex("0000")         # reserved / outer TLV header
        + len(chain_bytes).to_bytes(1, "big")   # chain ID byte length
        + chain_bytes                   # chain ID in big-endian
        + bytes.fromhex("14")           # address length = 20 (0x14)
        + addr_bytes                    # 20-byte address
    )

    return "0x" + encoded.hex()


def get_ensip25_text_key(registry_address: str, agent_id: str, chain_id: int) -> str:
    """
    Build the ENSIP-25 text record key for a given registry + agentId.

    Returns:
        e.g. "agent-registration[0x0001000003014a3414<addr>][1]"
    """
    erc7930 = encode_erc7930_address(chain_id, registry_address)
    return f"agent-registration[{erc7930}][{agent_id}]"


# ── Runtime config ────────────────────────────────────────────────────────────

def _load_registry_address() -> str:
    """Read ComplianceRegistry address from deployments JSON."""
    deployments_path = Path(
        os.getenv("DEPLOYMENTS_PATH", "../contracts/deployments/base-sepolia.json")
    )
    try:
        cfg = json.loads(deployments_path.read_text())
        return cfg.get("ComplianceRegistry", "")
    except Exception:
        return os.getenv("COMPLIANCE_REGISTRY_ADDRESS", "")


def get_provium_ensip25_key(agent_id: str | None = None) -> dict:
    """
    Return the ENSIP-25 text record key and setup instructions for the
    Provium agent's ENS name.

    Args:
        agent_id: Optional override. Defaults to env var ENSIP25_AGENT_ID or "1".

    Returns dict with:
        text_key    – the full text record key to set
        registry    – ERC-7930 encoded registry address
        agent_id    – the agent identifier used
        chain_id    – Base Sepolia chain ID (84532)
        ens_name    – the agent's ENS name (from env)
        instructions – human-readable setup guide
    """
    chain_id = 84532  # Base Sepolia
    registry_address = _load_registry_address()

    if not registry_address or registry_address == "0x0000000000000000000000000000000000000000":
        return {
            "error": "ComplianceRegistry address not found. Run `npm run deploy` first.",
            "setup_note": "Set COMPLIANCE_REGISTRY_ADDRESS in .env or deploy contracts.",
        }

    resolved_agent_id = agent_id or os.getenv("ENSIP25_AGENT_ID", "1")
    ens_name = os.getenv("NEXT_PUBLIC_ENS_AGENT_NAME", "provium-agent.eth")

    try:
        erc7930 = encode_erc7930_address(chain_id, registry_address)
        text_key = get_ensip25_text_key(registry_address, resolved_agent_id, chain_id)
    except Exception as e:
        return {"error": f"ERC-7930 encoding failed: {e}"}

    instructions = f"""
===============================================================
        ENSIP-25 Agent Verification Setup (Provium Agent)
===============================================================

ENS Name          : {ens_name}
Registry          : {registry_address}
  (ComplianceRegistry on Base Sepolia, chain {chain_id})
ERC-7930 Encoded  : {erc7930}
Agent ID          : {resolved_agent_id}

TEXT RECORD TO SET ON {ens_name}:
  Key   : {text_key}
  Value : 1

HOW TO SET IT:
  1. Go to https://app.ens.domains/name/{ens_name}/details
  2. Click "Add / Edit Record"
  3. Paste the key exactly as shown above
  4. Set the value to: 1
  5. Save (costs ~$0.50-$2 in gas on mainnet)

WHAT THIS ENABLES:
  Any dApp or protocol that wants to verify this agent is legitimate can:
    a. Read  {text_key}  from {ens_name}
    b. If the value is non-empty -- agent is verified
    c. This cryptographically ties the ENS name to the on-chain
       ComplianceRegistry entry -- no third-party trust needed.

VERIFICATION FLOW (ENSIP-25 Section 4.2):
  1. dApp reads agent registry entry -- finds claimed ENS name + agentId
  2. Constructs key = agent-registration[<registry>][<agentId>]
  3. Resolves text record on {ens_name}
  4. Non-empty value -- verified

ENV VARS TO CUSTOMIZE:
  ENSIP25_AGENT_ID          = {resolved_agent_id}
  NEXT_PUBLIC_ENS_AGENT_NAME = {ens_name}
"""

    return {
        "ens_name":     ens_name,
        "registry":     erc7930,
        "registry_raw": registry_address,
        "agent_id":     resolved_agent_id,
        "chain_id":     chain_id,
        "text_key":     text_key,
        "text_value":   "1",
        "instructions": instructions.strip(),
    }


def log_ensip25_setup() -> None:
    """
    Print ENSIP-25 setup instructions at agent startup.
    Logs the text record to set + verification key for the dashboard.
    """
    info = get_provium_ensip25_key()
    if "error" in info:
        log.warning(f"[ENSIP-25] Setup skipped: {info['error']}")
        return

    log.info("=" * 68)
    log.info("[ENSIP-25] Agent verification text record for ENS:")
    log.info(f"  ENS name  : {info['ens_name']}")
    log.info(f"  Key       : {info['text_key'][:80]}{'...' if len(info['text_key']) > 80 else ''}")
    log.info(f"  Value     : {info['text_value']}")
    log.info(f"  Chain     : Base Sepolia ({info['chain_id']})")
    log.info("  --> Set this text record on your ENS name to enable ENSIP-25 verification.")
    log.info("  --> Run: python -m tools.ensip25")
    log.info("=" * 68)


def verify_ensip25_text_key(text_record_value: str | None) -> bool:
    """
    ENSIP-25 §4.1: verification passes if the resolved text record value is non-empty.
    Verification clients MUST NOT depend on the specific value beyond it being non-empty.
    """
    return bool(text_record_value and text_record_value.strip())


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    agent_id_arg = sys.argv[1] if len(sys.argv) > 1 else None
    result = get_provium_ensip25_key(agent_id_arg)
    if "error" in result:
        print(f"Error: {result['error']}")
        if "setup_note" in result:
            print(result["setup_note"])
    else:
        print(result["instructions"])
        print()
        print(f"Text key: {result['text_key']}")
        print(f"Value   : {result['text_value']}")
