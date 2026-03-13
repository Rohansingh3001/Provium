#!/usr/bin/env bash
# ============================================================
# install_linux.sh  —  Full testnet environment setup (Linux)
# Run once after cloning the repo on a fresh Linux machine.
# ============================================================
set -e
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       Provium ZKComply — Linux Testnet Setup         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

## ── 0. Prerequisites check ──────────────────────────────────
command -v git  >/dev/null || { echo "[X] git not found. Install: sudo apt install git"; exit 1; }
command -v curl >/dev/null || { echo "[X] curl not found. Install: sudo apt install curl"; exit 1; }
command -v node >/dev/null || { echo "[X] node not found. Install Node 20+: https://nodejs.org"; exit 1; }
command -v npm  >/dev/null || { echo "[X] npm not found."; exit 1; }
echo "[OK] Prerequisites: git, curl, node, npm"

## ── 1. Python environment ────────────────────────────────────
echo ""
echo "── Step 1: Python dependencies ────────────────────────"
cd agent
python3 -m pip install -r requirements.txt
echo "[OK] Python packages installed"
cd ..

## ── 2. Install Noir / nargo ──────────────────────────────────
echo ""
echo "── Step 2: Install Noir toolchain (nargo) ─────────────"
if command -v nargo >/dev/null 2>&1; then
    echo "[OK] nargo already installed: $(nargo --version)"
else
    echo "     Installing noirup..."
    curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
    # Add to PATH for this session
    export PATH="$HOME/.nargo/bin:$PATH"
    echo "     Running noirup to install latest nargo..."
    noirup
    echo "[OK] nargo installed: $(nargo --version)"
fi

# Verify nargo is in PATH now
if ! command -v nargo >/dev/null 2>&1; then
    echo "[!] nargo not in PATH. Add to your shell profile:"
    echo "    export PATH=\"\$HOME/.nargo/bin:\$PATH\""
    echo "    Then run this script again."
    exit 1
fi

## ── 3. Node / Hardhat dependencies ──────────────────────────
echo ""
echo "── Step 3: Hardhat (contracts) dependencies ───────────"
cd contracts
npm install
echo "[OK] Hardhat packages installed"
cd ..

## ── 4. Dashboard dependencies ────────────────────────────────
echo ""
echo "── Step 4: Dashboard (Next.js) dependencies ───────────"
cd dashboard
npm install
echo "[OK] Dashboard packages installed"
cd ..

## ── 5. Compile Noir circuit ──────────────────────────────────
echo ""
echo "── Step 5: Compile Noir circuit ────────────────────────"
cd circuits/collateral_proof
nargo check
nargo compile
echo "[OK] Circuit compiled"
cd ../..

## ── 6. Generate REAL UltraVerifier contract ──────────────────
echo ""
echo "── Step 6: Generate real UltraVerifier.sol ─────────────"
echo "     This replaces the placeholder that always returns true."
cd circuits/collateral_proof
nargo codegen-verifier
VERIFIER_SRC="target/contract/UltraVerifier.sol"
if [ -f "$VERIFIER_SRC" ]; then
    cp "$VERIFIER_SRC" "../../contracts/src/UltraVerifier.sol"
    echo "[OK] Real UltraVerifier.sol written to contracts/src/"
    echo "[!]  You MUST redeploy contracts for on-chain verification to work:"
    echo "     cd ../../contracts && npx hardhat run scripts/deploy.ts --network baseSepolia"
else
    echo "[X] nargo codegen-verifier did not produce $VERIFIER_SRC"
    exit 1
fi
cd ../..

## ── 7. Verify Poseidon hash ──────────────────────────────────
echo ""
echo "── Step 7: Verify BN254 Poseidon matches Noir ──────────"
cd agent
python3 verify_setup.py
cd ..

## ── Done ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✓  Setup complete!                                  ║"
echo "║                                                      ║"
echo "║  Next steps:                                         ║"
echo "║  1. Add AGENT_PRIVATE_KEY to agent/.env              ║"
echo "║  2. Redeploy contracts (if UltraVerifier changed):   ║"
echo "║     cd contracts                                     ║"
echo "║     npx hardhat run scripts/deploy.ts --network baseSepolia"
echo "║  3. Update dashboard/.env.local with new addresses   ║"
echo "║  4. Run agent: cd agent && python3 main.py           ║"
echo "║  5. Run dashboard: cd dashboard && npm run dev       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
