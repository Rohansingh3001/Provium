// Provium ZKComply - Collateral compliance circuit (nargo >= 1.0.0)
// Uses std::hash::poseidon2_permutation (Poseidon2, t=4, BN254 field)
// matching acvm-repo/bn254_blackbox_solver poseidon2_permutation builtin.

fn p2hash(a: Field, b: Field) -> Field {
    // Poseidon2 permutation on state [a, b, 0, 0], return first element.
    // Matches Python poseidon2_hash_2(a, b) in agent/tools/proof_tools.py
    std::hash::poseidon2_permutation([a, b, 0, 0], 4)[0]
}

fn main(
    positions_collateral: [Field; 16],
    positions_debt: [Field; 16],
    merkle_paths: [[Field; 4]; 16],
    merkle_indices: [[bool; 4]; 16],
    positions_root: pub Field,
    min_ratio_bps: pub Field,
    total_collateral: pub Field,
    total_debt: pub Field,
    block_number: pub Field,
    protocol_address: pub Field
) {
    // Suppress unused-variable warnings for public inputs used by verifier only
    let _block = block_number;
    let _proto = protocol_address;

    let mut sum_collateral: Field = 0;
    let mut sum_debt: Field = 0;

    for i in 0..16 {
        let coll = positions_collateral[i];
        let debt = positions_debt[i];

        // 1. Each position individually above minimum ratio (u128 prevents Field overflow)
        // Prevents hiding undercollateralized positions in the aggregate
        assert((coll as u128) * 10000 >= (debt as u128) * (min_ratio_bps as u128));

        // 2. Tie private positions to public Merkle root via Poseidon2 Merkle tree
        let leaf = p2hash(coll, debt);
        let mut curr = leaf;
        for j in 0..4 {
            let left  = if merkle_indices[i][j] { merkle_paths[i][j] } else { curr };
            let right = if merkle_indices[i][j] { curr } else { merkle_paths[i][j] };
            curr = p2hash(left, right);
        }
        assert(curr == positions_root);

        sum_collateral += coll;
        sum_debt += debt;
    }

    // 3. Public aggregates must match private sum
    assert(sum_collateral == total_collateral);
    assert(sum_debt == total_debt);

    // 4. Belt-and-suspenders aggregate ratio check
    assert((total_collateral as u128) * 10000 >= (total_debt as u128) * (min_ratio_bps as u128));
}
