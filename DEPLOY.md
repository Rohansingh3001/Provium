# Provium — Complete Deployment Guide

**Goal:** Deploy contracts, compile circuit, and run agent on Base Sepolia.

> ✅ **Already deployed!** Contracts are live on Base Sepolia (block 38272672). See `contracts/deployments/base-sepolia.json` for addresses. Dashboard is running on port 3000. Skip to [Step 8](#step-8-run-agent-live) to run the agent, or [Step 9](#step-9-dashboard-setup) for dashboard.

---

## Prerequisites

- Node.js v18+
- Python 3.11+
- Noir (`nargo --version` should work)
- Base Sepolia ETH (get from [Alchemy faucet](https://www.alchemy.com/faucets/base-sepolia))

---

## Step 1: Contracts Setup

```bash
cd contracts

# Install dependencies
npm install

# Copy and fill .env
cp .env.example .env
```

Edit `contracts/.env`:
```env
BASE_SEPOLIA_RPC=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x...  # Your deployer wallet (needs ETH)
AGENT_WALLET_ADDRESS=0x...   # Agent wallet (will be set in contracts)
BASESCAN_API_KEY=...         # Optional, for verification
```

---

## Step 2: Compile Circuit & Generate Verifier

```bash
# Option A: Use the script (recommended)
npx ts-node scripts/compile-circuit.ts

# Option B: Manual
cd ../circuits/collateral_proof
nargo compile
nargo codegen-verifier
# Copy target/contract/UltraVerifier.sol to contracts/src/UltraVerifier.sol
```

**Verify:** `contracts/src/UltraVerifier.sol` should exist and NOT be the placeholder.

---

## Step 3: Compile Contracts

```bash
cd contracts
npx hardhat compile
```

Should compile without errors.

---

## Step 4: Deploy Contracts

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

**Expected output:**
```
MockWETH deployed to: 0x...
MockUSDC deployed to: 0x...
LendingProtocol deployed to: 0x...
RegulatorPortal deployed to: 0x...
ComplianceRegistry deployed to: 0x...
UltraVerifier deployed to: 0x...
✓ Deployment saved. Ready for agent.
```

**Check:** `contracts/deployments/base-sepolia.json` should exist with all addresses.

---

## Step 5: Seed Protocol with Test Positions

```bash
npx hardhat run scripts/seed.ts --network baseSepolia
```

**Expected output:**
```
Funding seed wallets...
Funded wallet 1: 0x...
...
Creating positions...
  Wallet 1 (...): HF = 163.0%
  Wallet 2 (...): HF = 178.0%
  ...
Users seeded: 5. ✓ Protocol seeded. Ready for agent.
```

---

## Step 6: Agent Setup

```bash
cd ../agent

# Create venv (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and fill .env
cp .env.example .env
```

Edit `agent/.env`:
```env
GROQ_API_KEY=gsk_...  # Already set
BASE_SEPOLIA_RPC=https://sepolia.base.org
AGENT_PRIVATE_KEY=0x...  # Same as AGENT_WALLET_ADDRESS from contracts/.env
AGENT_WALLET_ADDRESS=0x...  # Same as above
DEPLOYMENTS_PATH=../contracts/deployments/base-sepolia.json
CIRCUITS_PATH=../circuits/collateral_proof
```

**Important:** `AGENT_PRIVATE_KEY` must match `AGENT_WALLET_ADDRESS` and must have Base Sepolia ETH.

---

## Step 7: Test Agent (Dry Run)

```bash
python main.py --dry-run --once
```

Should complete without errors. Check logs for:
- ✓ All checks passed
- Watcher phase runs
- Analyst phase runs
- "DRY RUN - skipping proof generation"

---

## Step 8: Run Agent Live

```bash
# Single epoch (test)
python main.py --once

# Continuous (for demo)
python main.py --interval 120
```

**Expected:** Agent generates proofs, submits to ComplianceRegistry, logs tx hashes.

**Verify on Basescan:**
- Check ComplianceRegistry for new reports
- Check RegulatorPortal if you submitted a request
- View agent reasoning stored on-chain

---

## Step 9: Dashboard Setup

```bash
cd ../dashboard

# Install dependencies
npm install

# Copy and fill .env.local
cp .env.local.example .env.local
```

Edit `dashboard/.env.local`:
```env
NEXT_PUBLIC_LENDING_PROTOCOL=0x...    # From base-sepolia.json
NEXT_PUBLIC_REGULATOR_PORTAL=0x...    # From base-sepolia.json
NEXT_PUBLIC_COMPLIANCE_REGISTRY=0x... # From base-sepolia.json
NEXT_PUBLIC_ULTRA_VERIFIER=0x...      # From base-sepolia.json
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

```bash
npm run dev
```

Open http://localhost:3000/dashboard/overview

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `nargo not found` | `noirup` then `nargo --version` |
| `insufficient funds` | Fund deployer/agent wallet from faucet |
| `execution reverted` on `setAgentAddress` | Agent address not set correctly |
| Proof invalid / reverted | Ensure `poseidon-hash` installed — Merkle root must match circuit |
| Dashboard shows "0x0000..." | Check .env.local has correct addresses |

---

## Verification Checklist

- [x] Contracts deployed to Base Sepolia (block 38272672)
- [x] Circuit compiled (`nargo compile` — nargo 1.0.0-beta.19)
- [x] Verifier generated (`nargo codegen-verifier` — bb 4.0.0-nightly)
- [x] UltraVerifier.sol deployed to `0x93362E57c5dBA158420c8db8CB4484b12f96bB84`
- [x] Contracts compiled (`npx hardhat compile`)
- [x] Protocol seeded (5 users with positions above 150%)
- [x] Agent .env configured (Base Sepolia RPC, agent wallet, deployments path)
- [x] Agent dry-run succeeds
- [x] Agent live run generates proof on-chain
- [x] Dashboard .env.local configured with Base Sepolia addresses
- [x] Dashboard shows live data (port 3000, HTTP 200)
- [x] ZK enforcement: `UltraVerifier.verify()` wired into `submitReport()` + `fulfillRequest()`

---

## Quick Start (All Steps)

```bash
# 1. Contracts
cd contracts
npm install
cp .env.example .env  # Fill DEPLOYER_PRIVATE_KEY, AGENT_WALLET_ADDRESS
npx ts-node scripts/compile-circuit.ts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network baseSepolia
npx hardhat run scripts/seed.ts --network baseSepolia

# 2. Agent
cd ../agent
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env  # Fill AGENT_PRIVATE_KEY (same as AGENT_WALLET_ADDRESS)
python main.py --once  # Test

# 3. Dashboard
cd ../dashboard
npm install
cp .env.local.example .env.local  # Fill addresses from base-sepolia.json
npm run dev
```

---

## For Hackathon Demo

1. **Before demo:** Deploy contracts, seed protocol, run agent for 10 minutes to generate 2-3 proofs
2. **During demo:** Show Basescan links, dashboard with live data, agent terminal/logs
3. **Highlight:** LLM reasoning on-chain, ZK proof verification, autonomous agent

Good luck! 🚀
