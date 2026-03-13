#!/usr/bin/env bash
# ============================================================
# regen_verifier.sh — Generate real UltraVerifier from Noir circuit
#                     and redeploy all contracts to Base Sepolia.
#
# Run from repo root: bash regen_verifier.sh
# REQUIRES: nargo installed, contracts/.env filled, Base Sepolia ETH
# ============================================================
set -e
export PATH="$HOME/.nargo/bin:$PATH"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    Regenerate Real UltraVerifier + Redeploy          ║"
echo "╚══════════════════════════════════════════════════════╝"

# ── Step 1: Compile circuit ───────────────────────────────────
echo ""
echo "── Step 1: Compile Noir circuit ────────────────────────"
cd circuits/collateral_proof
nargo check
nargo compile
echo "[OK] Circuit compiled"

# ── Step 2: Generate verifier contract ───────────────────────
echo ""
echo "── Step 2: Generate UltraVerifier.sol ─────────────────"
nargo codegen-verifier
VERIFIER_OUT="target/contract/UltraVerifier.sol"
if [ ! -f "$VERIFIER_OUT" ]; then
    echo "[X] Expected output not found: $VERIFIER_OUT"
    exit 1
fi

# Backup old placeholder
cp "../../contracts/src/UltraVerifier.sol" "../../contracts/src/UltraVerifier.sol.placeholder"
cp "$VERIFIER_OUT" "../../contracts/src/UltraVerifier.sol"
echo "[OK] Real UltraVerifier.sol written (placeholder backed up as .placeholder)"
cd ../..

# ── Step 3: Compile & deploy contracts ───────────────────────
echo ""
echo "── Step 3: Deploy contracts to Base Sepolia ────────────"
cd contracts
npx hardhat compile --quiet
npx hardhat run scripts/deploy.ts --network baseSepolia
echo "[OK] Contracts deployed. New addresses in deployments/base-sepolia.json"

# ── Step 4: Update dashboard env ─────────────────────────────
echo ""
echo "── Step 4: Auto-updating dashboard/.env.local ─────────"
DEP_FILE="./deployments/base-sepolia.json"
if [ -f "$DEP_FILE" ]; then
    LENDING=$(node -e "const j=require('$DEP_FILE'); console.log(j.LendingProtocol)")
    PORTAL=$(node -e "const j=require('$DEP_FILE'); console.log(j.RegulatorPortal)")
    REGISTRY=$(node -e "const j=require('$DEP_FILE'); console.log(j.ComplianceRegistry)")
    VERIFIER=$(node -e "const j=require('$DEP_FILE'); console.log(j.UltraVerifier)")
    AGENT=$(node -e "const j=require('$DEP_FILE'); console.log(j.agentWallet)")

    cat > "../dashboard/.env.local" << EOF
NEXT_PUBLIC_LENDING_PROTOCOL=$LENDING
NEXT_PUBLIC_REGULATOR_PORTAL=$PORTAL
NEXT_PUBLIC_COMPLIANCE_REGISTRY=$REGISTRY
NEXT_PUBLIC_ULTRA_VERIFIER=$VERIFIER
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_AGENT_WALLET=$AGENT
EOF
    echo "[OK] dashboard/.env.local updated"
fi
cd ..

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✓  Real UltraVerifier deployed!                     ║"
echo "║                                                      ║"
echo "║  On-chain ZK verification is now REAL.               ║"
echo "║  All proofs will be cryptographically verified       ║"
echo "║  before being recorded on the blockchain.            ║"
echo "║                                                      ║"
echo "║  Run: bash run_agent_linux.sh                        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
