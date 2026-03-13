"""
proof_tools.py — Build Merkle tree, commit root on-chain, run real nargo prove.

POSEIDON NOTE:
  The Noir circuit uses std::hash::poseidon::bn254::hash_2.
  Python MUST use the same BN254 Poseidon to build the Merkle tree,
  otherwise nargo prove will fail (assert curr == positions_root).
  On Linux: install poseidon-hash>=1.1.0 and nargo (Noir toolchain).
  On Windows: proofs CANNOT be generated (nargo not supported).
"""
import json
import os
import subprocess
import sys
from pathlib import Path
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv
from agno.tools import tool

load_dotenv()

# ── BN254 field prime (same field Noir / barretenberg uses) ─────────────────
BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617

RPC            = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
AGENT_KEY      = os.getenv("AGENT_PRIVATE_KEY", "")
CIRCUITS_PATH  = Path(os.getenv("CIRCUITS_PATH", "../circuits/collateral_proof"))
DEPLOYMENTS    = Path(os.getenv("DEPLOYMENTS_PATH", "../contracts/deployments/base-sepolia.json"))

w3 = Web3(Web3.HTTPProvider(RPC))

try:
    cfg = json.loads(DEPLOYMENTS.read_text())
    LENDING_ADDR = Web3.to_checksum_address(cfg["LendingProtocol"])
except Exception:
    LENDING_ADDR = "0x0000000000000000000000000000000000000000"

LENDING_ABI_COMMIT = [
    {"inputs": [{"name": "root", "type": "bytes32"}, {"name": "blockNum", "type": "uint256"}],
     "name": "commitPositionRoot", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
]
lending = w3.eth.contract(address=LENDING_ADDR, abi=LENDING_ABI_COMMIT)

TREE_SIZE = 16
DEPTH     = 4  # log2(16)

# ── Real BN254 Poseidon (must match Noir's std::hash::poseidon::bn254::hash_2) ─
_bn254_poseidon_instance = None

def _get_poseidon():
    """Lazy-init BN254 Poseidon instance from poseidon-hash library."""
    global _bn254_poseidon_instance
    if _bn254_poseidon_instance is not None:
        return _bn254_poseidon_instance
    try:
        from poseidon import Poseidon
        _bn254_poseidon_instance = Poseidon(
            p=BN254_PRIME,
            security_level=128,
            alpha=5,
            input_rate=2,
            t=3,
        )
        return _bn254_poseidon_instance
    except ImportError:
        raise RuntimeError(
            "poseidon-hash not installed. Run: pip install poseidon-hash>=1.1.0\n"
            "This is required to match Noir's BN254 Poseidon hash in the ZK circuit."
        )


def _poseidon_bn254(a: int, b: int) -> int:
    """
    Real BN254 Poseidon hash matching Noir's std::hash::poseidon::bn254::hash_2.
    Both inputs and output are reduced mod BN254_PRIME.
    """
    p_inst = _get_poseidon()
    return int(p_inst.run_hash([a % BN254_PRIME, b % BN254_PRIME])) % BN254_PRIME



def _build_tree(leaves: list[int]) -> tuple[list[list[int]], int]:
    """Build a DEPTH=4 binary Merkle tree using BN254 Poseidon. Returns (all_levels, root)."""
    level = leaves[:]
    levels = [level[:]]
    for _ in range(DEPTH):
        next_level = []
        for i in range(0, len(level), 2):
            next_level.append(_poseidon_bn254(level[i], level[i+1] if i+1 < len(level) else level[i]))
        level = next_level
        levels.append(level[:])
    return levels, levels[-1][0]


def build_merkle_tree_and_inputs(positions_json: str) -> str:
    """
    Given positions JSON from get_all_positions(), build:
    1. Poseidon2 leaf hashes for each position
    2. DEPTH=4 Merkle tree → root
    3. Merkle paths + indices for each position
    4. Formatted Prover.toml content
    Returns JSON with root, prover_toml_content, total_collateral, total_debt, ratio_bps.
    """
    try:
        data = json.loads(positions_json)
        raw  = data.get("positions", [])

        # Pad to TREE_SIZE with zero positions
        padded = raw[:TREE_SIZE] + [{"collateral_wei": "0", "debt_usdc6": "0"}] * max(0, TREE_SIZE - len(raw))

        collaterals = [int(p.get("collateral_wei", p.get("collateral", 0))) for p in padded]
        debts       = [int(p.get("debt_usdc6", p.get("debt", 0))) for p in padded]

        # Build leaves = poseidon_bn254(collateral, debt) — matches Noir circuit
        leaves = [_poseidon_bn254(c, d) for c, d in zip(collaterals, debts)]

        levels, root = _build_tree(leaves)

        # Build merkle paths and indices for each leaf
        merkle_paths   = []
        merkle_indices = []
        for i in range(TREE_SIZE):
            path    = []
            indices = []
            idx = i
            for lvl in range(DEPTH):
                sibling_idx = idx ^ 1  # XOR flips last bit = sibling
                sibling = levels[lvl][sibling_idx] if sibling_idx < len(levels[lvl]) else levels[lvl][idx]
                path.append(str(sibling))
                indices.append("true" if idx % 2 == 1 else "false")  # true = we're right child
                idx //= 2
            merkle_paths.append(path)
            merkle_indices.append(indices)

        total_coll = sum(collaterals)
        total_debt = sum(debts)
        ratio_bps  = int(total_coll * 2000 * 1e6 * 10000 / (total_debt * 1e18)) if total_debt else 999999

        block_num  = data.get("block", w3.eth.block_number)
        root_str   = str(root)

        # Format Prover.toml
        def fmt_list(lst):      return "[" + ", ".join(f'"{x}"' for x in lst) + "]"
        def fmt_list2d(lst2d):  return "[\n" + ",\n".join("    " + fmt_list(row) for row in lst2d) + "\n]"

        prover_toml = f"""positions_collateral = {fmt_list(collaterals)}
positions_debt = {fmt_list(debts)}
merkle_paths = {fmt_list2d(merkle_paths)}
merkle_indices = {fmt_list2d(merkle_indices)}
positions_root = "{root_str}"
min_ratio_bps = "15000"
total_collateral = "{total_coll}"
total_debt = "{total_debt}"
block_number = "{block_num}"
protocol_address = "{LENDING_ADDR}"
"""
        return json.dumps({
            "root": root_str,
            "prover_toml_content": prover_toml,
            "total_collateral": total_coll,
            "total_debt": total_debt,
            "ratio_bps": ratio_bps,
            "block_number": block_num,
        })
    except Exception as e:
        return json.dumps({"error": str(e)})


def _is_dry_run() -> bool:
    return os.getenv("ZKCOMPLY_DRY_RUN", "") == "1"


def commit_merkle_root(root: str, block_number: int) -> str:
    """
    Write the Merkle root on-chain via LendingProtocol.commitPositionRoot().
    Must be called BEFORE generating proof. Returns tx hash + Basescan URL.
    """
    if _is_dry_run():
        return json.dumps({"tx_hash": "0xDRY_RUN", "root": root, "block_number": block_number, "skipped": True})
    try:
        account = Account.from_key(AGENT_KEY)
        nonce   = w3.eth.get_transaction_count(account.address)
        root_bytes = int(root).to_bytes(32, "big") if root.isdigit() else bytes.fromhex(root.replace("0x", ""))

        tx = lending.functions.commitPositionRoot(root_bytes, block_number).build_transaction({
            "from":     account.address,
            "nonce":    nonce,
            "gasPrice": w3.eth.gas_price,
        })
        signed  = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
        w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        return json.dumps({
            "tx_hash":       "0x" + tx_hash,
            "basescan_url":  f"https://sepolia.basescan.org/tx/0x{tx_hash}",
            "root":           root,
            "block_number":   block_number,
        })
    except Exception as e:
        return json.dumps({"error": str(e)})


def generate_zk_proof(prover_toml_content: str) -> str:
    """
    Generate a REAL ZK proof using Noir + Barretenberg.
    1. Writes Prover.toml
    2. Runs nargo prove (30-120 seconds)
    3. Reads proof from target/proof/collateral_proof.proof
    Returns proof_hex, public_inputs_json, is_compliant, generation_time_seconds.

    REQUIREMENTS (Linux only):
      - nargo installed: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
      - Run: noirup  (installs latest nargo)
    """
    import time
    # Fail fast on Windows — nargo is not supported
    if sys.platform == "win32":
        return json.dumps({
            "error": (
                "nargo is not available on Windows. "
                "Switch to Linux and install Noir: "
                "curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && noirup"
            ),
            "is_compliant": False,
            "proof_hex": "0x00",
        })

    try:
        toml_path = CIRCUITS_PATH / "Prover.toml"
        toml_path.write_text(prover_toml_content)

        t0 = time.time()
        try:
            result = subprocess.run(
                ["nargo", "prove"],
                cwd=str(CIRCUITS_PATH),
                capture_output=True, text=True, timeout=180
            )
            is_compliant = result.returncode == 0
        except FileNotFoundError:
            return json.dumps({
                "error": (
                    "nargo not found in PATH. "
                    "Install Noir on Linux: "
                    "curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && noirup"
                ),
                "is_compliant": False,
                "proof_hex": "0x00",
            })
        elapsed = round(time.time() - t0, 1)

        if not is_compliant:
            return json.dumps({
                "error": f"nargo prove failed (circuit constraints not satisfied): {result.stderr[-500:]}",
                "is_compliant": False,
                "proof_hex": "0x00",
                "stdout": result.stdout[-500:],
                "stderr": result.stderr[-500:],
                "generation_time_seconds": elapsed,
            })

        # Read proof file
        proof_file = CIRCUITS_PATH / "target" / "collateral_proof.proof"
        if not proof_file.exists():
            return json.dumps({
                "error": f"nargo prove succeeded but proof file not found at {proof_file}",
                "is_compliant": False,
                "proof_hex": "0x00",
            })
        proof_hex = "0x" + proof_file.read_bytes().hex()

        # Public inputs: parse from nargo stdout, or fallback to Prover.toml values
        public_inputs = []
        if result.stdout:
            for line in result.stdout.strip().split("\n"):
                line = line.strip()
                if line.startswith("0x") or (line.isdigit() and len(line) < 80):
                    public_inputs.append(line if line.startswith("0x") else str(int(line)))

        # Fallback: extract from Prover.toml for verifier (order: root, min_ratio, coll, debt, block, addr)
        if len(public_inputs) < 6:
            import re
            root  = re.search(r'positions_root = "([^"]+)"', prover_toml_content)
            ratio = re.search(r'min_ratio_bps = "([^"]+)"', prover_toml_content)
            coll  = re.search(r'total_collateral = "([^"]+)"', prover_toml_content)
            debt  = re.search(r'total_debt = "([^"]+)"', prover_toml_content)
            block = re.search(r'block_number = "([^"]+)"', prover_toml_content)
            addr  = re.search(r'protocol_address = "([^"]+)"', prover_toml_content)
            if all([root, ratio, coll, debt, block, addr]):
                for val in [root.group(1), ratio.group(1), coll.group(1), debt.group(1), block.group(1)]:
                    v = int(val) if val.isdigit() else int(val, 16) if val.startswith("0x") else 0
                    public_inputs.append("0x" + v.to_bytes(32, "big").hex())
                a = addr.group(1).replace("0x", "").lower()
                public_inputs.append("0x" + a.zfill(64) if len(a) <= 64 else "0x" + a[:64])

        return json.dumps({
            "proof_hex":               proof_hex,
            "public_inputs_json":      json.dumps(public_inputs),
            "is_compliant":            is_compliant,
            "generation_time_seconds": elapsed,
            "stdout": result.stdout[-500:] if result.stdout else "",
            "stderr": result.stderr[-500:] if result.stderr else "",
        })
    except subprocess.TimeoutExpired:
        return json.dumps({"error": "nargo prove timed out after 180s", "is_compliant": False, "proof_hex": "0x00"})
    except Exception as e:
        return json.dumps({"error": str(e), "is_compliant": False, "proof_hex": "0x00"})
