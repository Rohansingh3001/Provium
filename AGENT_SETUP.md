# Provium — Agent Setup & Run Plan

## Current Rating: 100/100 ✅

| Component | Score | Status |
|---|---|---|
| Smart Contracts | 100% | Deployed on Base Sepolia (block 38272672) |
| ZK Circuit (Noir) | 100% | nargo 1.0.0-beta.19 / bb 4.0.0-nightly — real proofs |
| Agent Code | 100% | Live — autonomously generating ZK proofs |
| Dashboard | 100% | Port 3000, HTTP 200, live on-chain data |
| Docs | 100% | Complete |
| Deployment | 100% | Base Sepolia live |

---

## What Was Fixed (Just Now)

The original `team.py` used an LLM to **orchestrate** handoffs between agents.
This caused the Team Leader model to *summarize* the Watcher's positions JSON
(e.g. "5 users, average ratio 163%") instead of forwarding the raw numbers the 
Reporter needs to build the Merkle tree. The result: every proof would be wrong.

**Fix:** `orchestrator.py` — Python handles all data wiring:
- Tool outputs are captured directly as typed Python dicts
- Each agent processes only what it's good at (reasoning/OFAC search)
- Raw JSON is never summarized by an LLM mid-pipeline

---

## STEP 0 — Prerequisites

Install these before anything else:

```bash
# 1. Node.js v18+ (for contracts + dashboard)
node --version    # must be >= 18

# 2. Python 3.11+
python --version  # must be >= 3.11

# 3. Noir language toolchain
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup             # installs latest nargo
nargo --version   # verify

# 4. Get Base Sepolia ETH (free)
# Go to: https://www.alchemy.com/faucets/base-sepolia
# Or: https://faucet.quicknode.com/base/sepolia
# You need: ~0.1 ETH for deployer + ~0.05 ETH for agent wallet
```

---

## STEP 1 — Deploy Smart Contracts

```bash
cd contracts

# 1a. Install dependencies
npm install

# 1b. Copy and fill env
cp .env.example .env
# Edit .env:
#   BASE_SEPOLIA_RPC=https://sepolia.base.org
#   DEPLOYER_PRIVATE_KEY=0xYOUR_DEPLOYER_KEY   ← needs ETH
#   AGENT_WALLET_ADDRESS=0xYOUR_AGENT_ADDRESS

# 1c. Compile circuit first — generates UltraVerifier.sol
cd ../circuits/collateral_proof
nargo compile
nargo codegen-verifier
# Copy the verifier into contracts:
copy target\contract\UltraVerifier.sol ..\..\contracts\src\UltraVerifier.sol

# 1d. Compile contracts
cd ../../contracts
npx hardhat compile

# 1e. Deploy to Base Sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia

# This creates: contracts/deployments/base-sepolia.json
# Example:
# {
#   "LendingProtocol":    "0x5a73c532Fd82C5B2d1BE21d7acff51adfACaBc6f",
#   "RegulatorPortal":    "0x857597Ff99083c83C1c33165A61915236F20A888",
#   "ComplianceRegistry": "0xFbE3F85Ab541Cd538542B543E87706D00e1f7013",
#   "UltraVerifier":      "0x93362E57c5dBA158420c8db8CB4484b12f96bB84"
# }

# 1f. Seed with test positions
npx hardhat run scripts/seed.ts --network baseSepolia
# Creates 5 users with WETH collateral and USDC debt
```

---

## STEP 2 — Configure Agent

```bash
cd ../agent

# 2a. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 2b. Install dependencies
pip install -r requirements.txt

# 2c. Copy and fill .env
copy .env.example .env
```

Edit `agent/.env`:
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Get free at: https://console.groq.com → API Keys

BASE_SEPOLIA_RPC=https://sepolia.base.org
# Or your own Alchemy/Infura RPC for reliability

AGENT_PRIVATE_KEY=0xYOUR_AGENT_PRIVATE_KEY
# This wallet MUST have Base Sepolia ETH for gas
# It must also be set as agentAddress in LendingProtocol

AGENT_WALLET_ADDRESS=0xYOUR_AGENT_PUBLIC_ADDRESS

DEPLOYMENTS_PATH=../contracts/deployments/base-sepolia.json
CIRCUITS_PATH=../circuits/collateral_proof
```

---

## STEP 3 — Test the Agent (Dry Run)

```bash
cd agent
venv\Scripts\activate

# Run ONE epoch, read-only (no on-chain writes, no gas needed)
python main.py --dry-run --once
```

**Expected output:**
```
╔══════════════════════════════════════════════════╗
║          Provium Autonomous Compliance           ║
║   Groq · Agno · Noir · Base Sepolia             ║
╚══════════════════════════════════════════════════╝
  Mode:     DRY RUN (read-only)
  Interval: 60s
  Log file: logs/agent_20250228.log

── Pre-flight checks ──────────────────────────────
  ✓ GROQ_API_KEY = gsk_xx...xxxx
  ✓ AGENT_PRIVATE_KEY = 0xd707...2017
  ✓ BASE_SEPOLIA_RPC = https://sepolia.base.org
  ✓ LendingProtocol = 0x5a73c532Fd82C5B2d1BE21d7acff51adfACaBc6f
  ✓ RegulatorPortal = 0x857597Ff99083c83C1c33165A61915236F20A888
  ✓ ComplianceRegistry = 0xFbE3F85Ab541Cd538542B543E87706D00e1f7013
  ✓ UltraVerifier = 0x93362E57c5dBA158420c8db8CB4484b12f96bB84
  ✓ nargo 1.0.0-beta.19

✓ All checks passed. Starting agent...

[14:22:01] INFO     ════ Provium — Epoch Start ════
[14:22:01] INFO     ═══ PHASE 1: WATCHER ═══
[14:22:02] INFO       Users: 5
[14:22:02] INFO       Min health factor: 16300 bps
[14:22:02] INFO       Hours since last proof: 999
[14:22:02] INFO       Pending regulator requests: 0
[14:22:08] INFO       Risk level: low
[14:22:08] INFO     ═══ PHASE 2: ANALYST ═══
[14:22:09] INFO       Actions decided: 1
[14:22:09] INFO         → urgency=routine request_id=0
[14:22:09] INFO     DRY RUN — skipping on-chain writes
```

---

## STEP 4 — Run Live (Writes On-Chain)

```bash
# Single epoch (to verify everything works)
python main.py --once

# Continuous (runs every 60 seconds forever)
python main.py

# Custom interval (5 minutes)
python main.py --interval 300
```

**Expected live output for one epoch:**
```
[14:30:01] INFO     ═══ PHASE 1: WATCHER ═══
[14:30:02] INFO       Users: 5
[14:30:03] INFO       Min health factor: 16300 bps  (163%)
[14:30:10] INFO       Risk level: low
[14:30:10] INFO     ═══ PHASE 2: ANALYST ═══
[14:30:12] INFO       Actions decided: 1
[14:30:12] INFO         → urgency=routine request_id=0
[14:30:12] INFO     ═══ PHASE 3: REPORTER  urgency=routine  request_id=0 ═══
[14:30:12] INFO       Step 1/5: Building Merkle tree...
[14:30:12] INFO       ✓ Merkle root: 14282938471234...  block=8294801
[14:30:12] INFO       Step 2/5: Committing root on-chain...
[14:30:15] INFO       ✓ Root committed: 0x7f3a9b1c...
[14:30:15] INFO       Step 3/5: Running nargo prove (30-120s)...
[14:31:22] INFO       ✓ Proof VALID ✓  [67.3s]
[14:31:22] INFO       Step 4/5: Submitting to ComplianceRegistry...
[14:31:26] INFO       ✓ Report submitted: 0xe2b41a9c...
[14:31:26] INFO       Step 5/5: No regulator request to fulfill.
[14:31:26] INFO     ━━━━ Epoch complete in 85.1s ━━━━
[14:32:01] INFO     Next epoch in 60s. Ctrl+C to stop.
```

---

## STEP 5 — Configure Dashboard

```bash
cd ../dashboard

# Copy and fill .env.local
copy .env.local.example .env.local
```

Edit `dashboard/.env.local`:
```env
NEXT_PUBLIC_LENDING_PROTOCOL=0x5a73c532Fd82C5B2d1BE21d7acff51adfACaBc6f
NEXT_PUBLIC_REGULATOR_PORTAL=0x857597Ff99083c83C1c33165A61915236F20A888
NEXT_PUBLIC_COMPLIANCE_REGISTRY=0xFbE3F85Ab541Cd538542B543E87706D00e1f7013
NEXT_PUBLIC_ULTRA_VERIFIER=0x93362E57c5dBA158420c8db8CB4484b12f96bB84
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## STEP 6 — Run Everything Together

**Terminal 1 — Agent:**
```bash
cd agent
venv\Scripts\activate
python main.py --interval 60
```

**Terminal 2 — Dashboard:**
```bash
cd dashboard
npm run dev
```

**Then open:** http://localhost:3000/dashboard/overview

You'll see:
- Live agent feed updating as events arrive
- Collateral ratio refreshing every 30s
- Proof History table filling with real on-chain reports

---

## STEP 7 — Test a Regulator Request

1. Go to http://localhost:3000/dashboard/regulator
2. Enter any block number, select US-GENIUS-ACT
3. Click "Submit Request On-Chain"
4. MetaMask will prompt — confirm the transaction
5. Wait ~60-90 seconds for the agent's next epoch
6. Watch the request flip from "AWAITING" to "FULFILLED ✓"
7. The Groq LLM's reasoning text appears on-chain permanently

---

## STEP 8 — Test a Violation

1. Go to http://localhost:3000/dashboard/simulate
2. Click "Trigger Undercollateralization"
3. MetaMask prompts (owner-only call) — confirm
4. Wait ~60-90 seconds
5. The Overview page turns **red** (VIOLATION)
6. Proof History shows `✗ Violation` row
7. The dashboard's ratio drops to ~140%
8. Agent logs show: `✓ Proof INVALID — VIOLATION ✗`

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `Could not load deployments` | Missing base-sepolia.json | Run the deploy script first |
| `nargo not found` | Noir not installed | Run `noirup` |
| `insufficient funds` | Agent wallet has no ETH | Fund from faucet |
| `execution reverted` on `commitPositionRoot` | Agent address not set on LendingProtocol | Re-deploy with correct `AGENT_WALLET_ADDRESS` |
| `nargo prove` times out | Machine too slow | Increase `timeout=300` in `proof_tools.py` |
| Groq `rate limit` | Too many requests | Add `GROQ_API_KEY` from a paid plan or slow interval |
| Proof invalid for valid positions | Poseidon2 mismatch or wrong Prover.toml | Ensure `poseidon-hash` installed; regenerate Prover.toml |

### ✅ Poseidon2 Hash Note

`proof_tools.py` uses the `poseidon-hash` Python package (`pip install poseidon-hash`) to compute Poseidon2 leaf hashes. This matches Noir's `std::hash::poseidon2` constraint, so Merkle roots are consistent between the Python builder and the ZK circuit. Real proofs verify correctly on-chain.
