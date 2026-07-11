"""
demo_fake_proof.py - quick end-to-end walkthrough of the proof pipeline WITHOUT
running nargo/bb (useful on Windows or any machine without the Noir toolchain).

It performs the real, deterministic parts (read positions -> Poseidon2 Merkle tree
-> public inputs) and then STUBS the proving step with a placeholder proof, so you
can see the whole data flow in seconds. For a real proof, run on Linux with the
Noir toolchain installed and use `python main.py --once`.

Run:  cd agent && python demo_fake_proof.py
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
os.environ["ZKCOMPLY_DRY_RUN"] = "1"  # never touch the chain in this demo

from tools.poseidon2 import poseidon2_selftest
from tools.proof_tools import build_merkle_tree_and_inputs

BAR = "=" * 64


def main():
    print(BAR)
    print("  Provium - FAKE PROOF DEMO (no nargo/bb required)")
    print(BAR)

    # 0. Prove our Poseidon2 matches the circuit's hash.
    poseidon2_selftest()
    print("\n[0] Poseidon2 self-test PASSED - Python hash matches the Noir circuit.")

    # 1. A synthetic protocol snapshot (what the Watcher would read on-chain).
    positions = {
        "block": 8_294_801,
        "positions": [
            {"collateral_wei": str(4 * 10**18), "debt_usdc6": str(2000 * 10**6)},   # 400%
            {"collateral_wei": str(3 * 10**18), "debt_usdc6": str(1000 * 10**6)},   # 600%
            {"collateral_wei": str(5 * 10**18), "debt_usdc6": str(3000 * 10**6)},   # ~333%
        ],
    }
    print(f"\n[1] Protocol snapshot: {len(positions['positions'])} positions at block "
          f"#{positions['block']}")

    # 2. Deterministic Merkle tree + public inputs (the REAL cryptographic work).
    tree = json.loads(build_merkle_tree_and_inputs(json.dumps(positions)))
    if "error" in tree:
        print(f"    ERROR building tree: {tree['error']}")
        return 1
    print("\n[2] Built Poseidon2 Merkle tree (padded to 16 leaves):")
    print(f"    positions_root   = {tree['root'][:32]}...")
    print(f"    total_collateral = {tree['total_collateral']} wei")
    print(f"    total_debt       = {tree['total_debt']} (USDC-6)")
    print(f"    ratio_bps        = {tree['ratio_bps']}  ({tree['ratio_bps'] / 100:.1f}%)")
    print(f"    min_ratio_bps    = 15000 (150% threshold enforced per-position)")

    # 3. STUB the proof (this is the only faked part).
    fake_proof_hex = "0x" + "ab" * 64
    public_inputs = [
        tree["root"],                       # positions_root
        "15000",                            # min_ratio_bps
        str(tree["total_collateral"]),      # total_collateral
        str(tree["total_debt"]),            # total_debt
        str(tree["block_number"]),          # block_number
        "protocol_address (uint160)",       # protocol_address
    ]
    print("\n[3] [STUB] Proof generation skipped (no nargo/bb in this demo).")
    print(f"    fake proof   = {fake_proof_hex[:22]}...")
    print("    public inputs (order the circuit + contracts expect):")
    for i, pi in enumerate(public_inputs):
        label = ["positions_root", "min_ratio_bps", "total_collateral",
                 "total_debt", "block_number", "protocol_address"][i]
        val = pi if len(str(pi)) < 40 else str(pi)[:36] + "..."
        print(f"      [{i}] {label:<16} = {val}")

    # 4. Explain the on-chain binding that a real submission triggers.
    print("\n[4] On submitReport(), ComplianceRegistry would (with a REAL proof):")
    print("      * verify(proof, publicInputs) on UltraVerifier")
    print("      * require publicInputs[0] == LendingProtocol.currentPositionRoot()")
    print("      * require publicInputs[2/3/4] == totalCollateral/totalDebt/blockNumber")
    print("      * require publicInputs[1] == requiredRatioBps (15000)")
    print("      * require publicInputs[5] == the LendingProtocol address")
    print("    -> a valid proof can no longer be paired with mismatched report values.")

    print("\n" + BAR)
    print("  Demo complete. For a REAL proof: Linux + Noir toolchain, `python main.py --once`.")
    print(BAR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
