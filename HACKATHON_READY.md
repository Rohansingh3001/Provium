# Provium — Hackathon Readiness Checklist

**Status:** ✅ Contracts, Circuit, and Agent are 100% ready for deployment.

---

## ✅ Contracts — READY

- [x] **Deployment script** (`contracts/scripts/deploy.ts`)
  - Deploys all contracts (MockWETH, MockUSDC, LendingProtocol, RegulatorPortal, ComplianceRegistry, UltraVerifier)
  - Sets agent addresses automatically
  - Saves deployments to `base-sepolia.json`
  - Mints initial liquidity

- [x] **Seed script** (`contracts/scripts/seed.ts`)
  - Creates 5 test users with positions
  - All positions above 150% health factor (compliant)
  - Uses deterministic wallets (no env vars needed)

- [x] **Hardhat config** (`contracts/hardhat.config.ts`)
  - Base Sepolia network configured
  - Basescan verification ready

- [x] **Environment template** (`contracts/.env.example`)
  - Updated for Base Sepolia
  - Clear instructions

**To deploy:**
```bash
cd contracts
npm install
cp .env.example .env  # Fill DEPLOYER_PRIVATE_KEY, AGENT_WALLET_ADDRESS
npx hardhat run scripts/deploy.ts --network baseSepolia
npx hardhat run scripts/seed.ts --network baseSepolia
```

---

## ✅ Circuit — READY

- [x] **Noir circuit** (`circuits/collateral_proof/src/main.nr`)
  - Poseidon2 Merkle tree verification
  - Individual position ratio checks
  - Aggregate ratio check
  - Range checks for overflow protection

- [x] **Compilation script** (`contracts/scripts/compile-circuit.ts`)
  - Checks for nargo
  - Compiles circuit
  - Generates verifier
  - Copies to contracts/src/

- [x] **Nargo config** (`circuits/collateral_proof/Nargo.toml`)
  - Properly configured

**To compile:**
```bash
cd contracts
npx ts-node scripts/compile-circuit.ts
# OR manually:
cd ../circuits/collateral_proof
nargo compile
nargo codegen-verifier
# Copy target/contract/UltraVerifier.sol to contracts/src/
```

**Note:** The circuit is compiled and the real `UltraVerifier.sol` is deployed. `UltraVerifier.verify()` is wired into both `submitReport()` and `fulfillRequest()` — the EVM will reject any invalid proof.

---

## ✅ Agent — READY

- [x] **Core orchestrator** (`agent/orchestrator.py`)
  - Deterministic pipeline (no LLM data corruption)
  - Dry-run support
  - Retry logic for LLM calls
  - Proper error handling

- [x] **Three agents** (`agent/agents/`)
  - **Watcher**: On-chain risk assessment (health factors, staleness, pending requests)
  - **Analyst**: Decision logic with on-chain reasoning
  - **Reporter**: Proof generation pipeline

- [x] **Tools** (`agent/tools/`)
  - `chain_tools.py`: Read from contracts
  - `proof_tools.py`: Merkle tree + Poseidon2 + nargo prove
  - `submit_tools.py`: On-chain writes

- [x] **Main entry** (`agent/main.py`)
  - Pre-flight checks (env, deployments, nargo, RPC)
  - Dry-run mode
  - Continuous mode with interval
  - Proper logging

- [x] **Dependencies** (`agent/requirements.txt`)
  - All packages listed (agno, groq, web3, poseidon-hash, ddgs, etc.)

- [x] **Environment** (`agent/.env.example`)
  - Base Sepolia configured
  - Clear instructions

- [x] **Go-live guide** (`agent/GO_LIVE.md`)
  - Step-by-step instructions
  - Troubleshooting

**To run:**
```bash
cd agent
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env  # Fill AGENT_PRIVATE_KEY (same as AGENT_WALLET_ADDRESS)
python main.py --dry-run --once  # Test
python main.py --once  # Live test
python main.py --interval 120  # Continuous
```

---

## 🎯 Quick Start (All-in-One)

```bash
# 1. Contracts
cd contracts
npm install
cp .env.example .env
# Edit .env: DEPLOYER_PRIVATE_KEY, AGENT_WALLET_ADDRESS

# 2. Circuit (optional - use placeholder for quick demo)
npx ts-node scripts/compile-circuit.ts

# 3. Deploy
npx hardhat compile
npx hardhat run scripts/deploy.ts --network baseSepolia
npx hardhat run scripts/seed.ts --network baseSepolia

# 4. Agent
cd ../agent
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: AGENT_PRIVATE_KEY (same as AGENT_WALLET_ADDRESS from contracts/.env)
python main.py --once

# 5. Dashboard
cd ../dashboard
npm install
cp .env.local.example .env.local
# Edit .env.local: Copy addresses from contracts/deployments/base-sepolia.json
npm run dev
```

---

## 📋 Pre-Demo Checklist

**24 hours before:**
- [x] Deploy contracts to Base Sepolia
- [x] Seed protocol with 5 users
- [x] Run agent for 10 minutes (generates 2-3 proofs)
- [x] Submit one regulator request from dashboard
- [x] Verify agent fulfills it
- [x] Test dashboard shows live data

**1 hour before:**
- [x] Start agent: `python main.py --interval 120`
- [x] Start dashboard: `npm run dev`
- [x] Have Basescan links ready (LendingProtocol, ComplianceRegistry, RegulatorPortal)
- [x] Have agent logs visible (terminal or log file)

**During demo:**
- [ ] Show contracts on Basescan
- [ ] Show agent terminal/logs
- [ ] Show dashboard with live compliance status
- [ ] Show proof history with LLM reasoning
- [ ] Submit regulator request live (if time permits)

---

## 🚀 Demo Flow (5-7 minutes)

1. **Problem** (30s): "DeFi protocols can't prove compliance without exposing user data. ShapeShift paid $750k fine."

2. **Solution** (30s): "Provium uses ZK proofs + AI agents to prove compliance cryptographically. Zero user data exposed."

3. **Contracts** (1min): Show Basescan links. "All contracts deployed on Base Sepolia. Here's ComplianceRegistry storing proofs."

4. **Agent** (2min): Show terminal/logs. "Autonomous agent runs every 2 minutes. Watches positions on-chain, assesses risk level, decides when to prove, writes reasoning on-chain. No human."

5. **Dashboard** (2min): Show Overview → Proof History → Regulator Portal. "Here's the agent's reasoning stored forever. Regulators can verify cryptographically."

6. **Circuit** (1min): "ZK circuit verifies every position is above 150% without revealing individual positions. The math is the auditor."

---

## ⚠️ Common Issues & Fixes

| Issue | Quick Fix |
|-------|-----------|
| `nargo not found` | `noirup` |
| `insufficient funds` | Use Base Sepolia faucet |
| `poseidon-hash not installed` | `pip install poseidon-hash` |
| Agent can't read contracts | Check `DEPLOYMENTS_PATH` in agent/.env |
| Dashboard shows zeros | Check `NEXT_PUBLIC_*` in dashboard/.env.local |

---

## 📊 What's Working

✅ **Contracts**: Deployed on Base Sepolia (block 38272672), seeded with 5 users  
✅ **Circuit**: nargo 1.0.0-beta.19 / bb 4.0.0-nightly — real ZK proofs verified on-chain  
✅ **Agent**: Watcher → Analyst → Reporter pipeline fully operational  
✅ **Dashboard**: Live data, proof history, regulator portal (port 3000)  
✅ **Integration**: Agent writes to contracts, dashboard reads live  
✅ **ZK Enforcement**: `UltraVerifier.verify()` rejects fake proofs — EVM-enforced  

---

## 🎯 Hackathon Differentiation

1. **LLM reasoning on-chain** — Show agent's text in ComplianceRegistry
2. **Autonomous agent** — No human in the loop, runs 24/7
3. **ZK privacy** — Prove compliance without exposing users
4. **Regulator flow** — Submit request → agent fulfills automatically (proven on-chain)
5. **Real tech stack** — Groq + Agno + Noir + Base Sepolia
6. **On-chain ZK enforcement** — `UltraVerifier.verify()` in both `submitReport()` and `fulfillRequest()` — EVM rejects fake proofs
7. **Live demo scripts** — `demo_fake_proof.py` shows EVM rejecting garbage/crafted proofs; `demo_regulator_flow.py` shows end-to-end regulator fulfillment

---

## 🧪 Live Demo Scripts

```bash
# Demo 1: EVM rejecting fake proofs (shows ZK enforcement is real)
python demo_fake_proof.py
# Expected: garbage → REVERTED ✓, crafted 0xFF → REVERTED ✓, real proof → TX ACCEPTED ✓

# Demo 2: End-to-end regulator compliance flow
python demo_regulator_flow.py
# Expected: request submitted → confirmed pending → fulfilled with ZK proof → on-chain reasoning visible
```

---

**You're ready! 🚀**

For detailed deployment steps, see `DEPLOY.md`.
