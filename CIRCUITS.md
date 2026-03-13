# Circuits Module — `circuits/`

The Zero Knowledge proof layer. One Noir circuit enforces five invariants over 16 private positions using Poseidon2 Merkle trees on the BN254 field.

---

## Directory Layout

```
circuits/
└── collateral_proof/
    ├── Nargo.toml          # Package manifest — name, type, nargo version
    ├── Prover.toml         # Private + public inputs (generated each epoch by agent)
    ├── src/
    │   └── main.nr         # The ZK circuit — 59 lines
    └── target/
        ├── collateral_proof.json   # Compiled circuit (ACIR bytecode)
        └── proof                   # Latest generated proof bytes
```

---

## The Circuit — `src/main.nr`

```noir
fn main(
    positions_collateral: [Field; 16],   // private
    positions_debt:        [Field; 16],   // private
    merkle_paths:         [[Field; 4]; 16], // private
    merkle_indices:       [[bool; 4]; 16],  // private
    positions_root:  pub Field,   // public — committed on-chain first
    min_ratio_bps:   pub Field,   // public — 15000 = 150%
    total_collateral: pub Field,  // public — must match private sum
    total_debt:       pub Field,  // public — must match private sum
    block_number:    pub Field,   // public — ties proof to a specific block
    protocol_address: pub Field   // public — ties proof to a specific contract
)
```

### Circuit Inputs

**Private (only the prover sees these):**
- `positions_collateral[16]` — each position's collateral in wei, padded to 16 with zeros
- `positions_debt[16]` — each position's debt in USDC units × 10⁶, padded to 16
- `merkle_paths[16][4]` — sibling nodes for each position in the 4-level Merkle tree
- `merkle_indices[16][4]` — which side (left/right) each node is on

**Public (regulator/verifier sees these, but NOT the raw positions):**
- `positions_root` — Poseidon2 Merkle root of all positions, committed on-chain
- `min_ratio_bps` — 15000 (= 150% × 100, the GENIUS Act threshold)
- `total_collateral` — aggregate collateral (sum of privates, forced to match by assert)
- `total_debt` — aggregate debt
- `block_number` — proof is tied to this block
- `protocol_address` — proof is tied to this contract

---

## The Five Invariants (`assert` rules)

The circuit enforces these for every one of the 16 slots:

### 1 — Per-position minimum ratio

```noir
assert((coll as u128) * 10000 >= (debt as u128) * (min_ratio_bps as u128));
```

Every individual position must be above 150%. A position at 140% cannot hide inside an aggregate that passes. Cast to `u128` prevents BN254 field overflow on large debt numbers.

### 2 — Poseidon2 Merkle membership

```noir
let leaf = p2hash(coll, debt);      // hash the position
// ... walk the Merkle path 4 levels up ...
assert(curr == positions_root);      // must arrive at the committed root
```

Every private position is cryptographically tied to the public root. You cannot prove membership of a fake position; you cannot omit a real one.

### 3 & 4 — Aggregate totals match private sums

```noir
assert(sum_collateral == total_collateral);
assert(sum_debt == total_debt);
```

The public aggregate figures must equal the sum of all private positions. No rounding, no fudging.

### 5 — Belt-and-suspenders aggregate check

```noir
assert((total_collateral as u128) * 10000 >= (total_debt as u128) * (min_ratio_bps as u128));
```

A final check on the aggregate ratio — redundant with individual checks but adds defence-in-depth.

---

## The Poseidon2 Hash Function

```noir
fn p2hash(a: Field, b: Field) -> Field {
    std::hash::poseidon2_permutation([a, b, 0, 0], 4)[0]
}
```

Uses Noir's built-in `poseidon2_permutation` (t=4, BN254 field). The Python agent uses the same hash via `poseidon-hash >= 1.1.0` to build the tree — both sides must produce identical outputs or the Merkle root won't match.

---

## Prover.toml — What the Agent Writes

`proof_tools.py` generates this file each epoch. It is the input file `nargo prove` reads.

```toml
# Public inputs
positions_root = "0x1a2b3c..."
min_ratio_bps  = "15000"
total_collateral = "342000000000000000000"  # 342 ETH in wei
total_debt       = "200000000000"           # 200,000 USDC in 10^6 units
block_number     = "8294801"
protocol_address = "0xABC..."

# Private inputs (16 positions, padded with zeros)
positions_collateral = ["68400000000000000000", "...", "0", "0", "0", ...]
positions_debt       = ["40000000000", "...", "0", "0", "0", ...]

# Merkle paths (16 × 4 siblings)
merkle_paths = [["0x...", "0x...", "0x...", "0x..."], ...]
merkle_indices = [[false, true, ...], ...]
```

---

## Proof Generation — What nargo Does

```bash
cd circuits/collateral_proof
nargo prove
```

This runs the Barretenberg UltraHonk prover under the hood:
1. Reads `Prover.toml` → constructs witness
2. Executes the circuit ACIR bytecode against the witness
3. Generates a BN254 PlonK proof (`target/proof`) — typically 30–120 seconds
4. The proof is only valid if all five `assert` rules pass

The resulting `proof` bytes are read by `proof_tools.py` and returned as `proof_hex`.

---

## Regenerating the UltraVerifier Contract

When the circuit changes, run from the repo root:

```bash
bash regen_verifier.sh
```

This:
1. Compiles the circuit with `nargo compile`
2. Runs `nargo export-contract` (Barretenberg) to generate `UltraVerifier.sol`
3. Copies `UltraVerifier.sol` into `contracts/src/`
4. Redeploys with `npx hardhat run scripts/deploy.ts --network baseSepolia`

The `UltraVerifier.sol` in the contracts folder is **generated** — it is not hand-written.

---

## Why BN254 Poseidon2 (not SHA-256)

SHA-256 inside a ZK circuit requires thousands of constraints per hash. BN254 Poseidon2 is **native to the BN254 field** that Barretenberg uses — it requires ~dozens of constraints. Building a 16-leaf Merkle tree with SHA-256 would make proof generation prohibitively slow (minutes to hours). With Poseidon2, it takes 30–120 seconds.

---

## Circuit Security Notes

- **No overflow:** All ratio math is cast to `u128` before multiplication to prevent BN254 field wraparound producing false-positive compliance
- **Padding positions:** Zero-collateral, zero-debt positions still satisfy `0 * 10000 >= 0 * 15000` — so padding to 16 doesn't introduce false positives on the threshold check (0/0 is treated as compliant)
- **Fixed depth:** 4-level tree supports exactly 16 positions. Extending to 32 positions requires deepening to 5 levels and recompiling the circuit
