# Provium Agent — Go-Live Checklist

> ✅ **Already live!** Contracts deployed on Base Sepolia (block 38272672). Agent wallet: `0xd707187453D29b8b3b017A02e4E6d6f6E5222017`. Run `python main.py --once` from the `agent/` directory to execute one epoch.

## Pre-Launch Verification

### 1. Environment
- [x] `GROQ_API_KEY` — valid, from [console.groq.com](https://console.groq.com)
- [x] `BASE_SEPOLIA_RPC` — working RPC (`https://sepolia.base.org`)
- [x] `AGENT_PRIVATE_KEY` — wallet `0xd707187453D29b8b3b017A02e4E6d6f6E5222017` has Base Sepolia ETH for gas
- [x] `DEPLOYMENTS_PATH` — points to `../contracts/deployments/base-sepolia.json`

### 2. Contracts Deployed
- [x] MockWETH: `0x9F22C578DFEC01Fa58DBDA1B49427Fdfb91B2b0F`
- [x] MockUSDC: `0x1bb719EFd1bFffAa6D79c1e0512cb6D893144829`
- [x] LendingProtocol: `0x5a73c532Fd82C5B2d1BE21d7acff51adfACaBc6f`
- [x] RegulatorPortal: `0x857597Ff99083c83C1c33165A61915236F20A888`
- [x] ComplianceRegistry: `0xFbE3F85Ab541Cd538542B543E87706D00e1f7013`
- [x] UltraVerifier: `0x93362E57c5dBA158420c8db8CB4484b12f96bB84`

### 3. Circuit Compiled
- [x] nargo 1.0.0-beta.19 / bb 4.0.0-nightly
- [x] `circuits/collateral_proof/target/proof/collateral_proof.proof/proof` exists
- [x] `UltraVerifier.verify()` wired into `submitReport()` + `fulfillRequest()`

### 4. Poseidon Hash
- [x] `poseidon-hash` installed — Merkle roots match Noir circuit exactly

### 5. Dry Run First
```bash
cd agent
python main.py --dry-run --once
```
Expected: Watcher → Analyst → "DRY RUN — skipping proof generation"

### 6. Single Live Epoch
```bash
python main.py --once
```
Expected: Full pipeline, proof submitted on-chain, tx hashes in logs.

### 7. Continuous Mode
```bash
python main.py --interval 60
```
Runs every 60 seconds. Use `--interval 300` for 5-minute epochs.

---

## Agent Roles (What Each Does)

| Agent | Role | LLM Used For |
|-------|------|--------------|
| **Watcher** | On-chain risk assessment | Chain data → risk_level (`low/medium/high/critical`), pending requests |
| **Analyst** | Decision logic | Chain metrics → actions[] with urgency, agent_reasoning |
| **Reporter** | Proof pipeline | Tools called by orchestrator (no LLM in loop) |

All three agents use `llama-3.3-70b-versatile` (Groq). The orchestrator wires data directly — raw JSON never passes through an LLM to avoid summarization errors.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `nargo not found` | `noirup` then `nargo --version` |
| `insufficient funds` | Fund agent wallet from Base Sepolia faucet |
| `execution reverted` on commit | Agent address not set on LendingProtocol |
| Proof invalid | Ensure `poseidon-hash` installed; Merkle tree must match circuit |
| Groq rate limit | Slow `--interval` or use paid plan |
| RPC timeout | Use Alchemy/Infura RPC instead of public |

---

## Logs

- Daily: `logs/agent_YYYYMMDD.log`
- Stdout: real-time feed
