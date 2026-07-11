# Provium — Autonomous ZK Compliance for DeFi

> **Zero-knowledge proof of lending solvency, submitted on-chain by an autonomous AI agent, verifiable by anyone.**

Provium is an end-to-end compliance infrastructure for DeFi lending protocols. An autonomous agent monitors protocol positions, generates ZK proofs that each position meets a configurable collateral threshold (without revealing individual balances), and submits verifiable reports on-chain — while regulators can request ad-hoc compliance audits through an on-chain portal.

Inspired by the transparency goals of the **US GENIUS Act** (1:1 reserve attestation for stablecoin issuers). Deployed on **Base Sepolia** as a DeFi lending collateral-ratio demo.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REGULATOR / USER                            │
│                    (Browser + MetaMask/Rainbow)                     │
└────────────┬──────────────────────────────────┬─────────────────────┘
             │  Request compliance proof         │  View dashboard
             ▼                                   ▼
┌────────────────────────┐         ┌──────────────────────────────────┐
│   RegulatorPortal.sol  │         │  Next.js Dashboard               │
│   On-chain request     │         │  ├─ Overview   (agent status)    │
│   queue + fulfillment  │         │  ├─ Proofs     (proof history)   │
└────────────┬───────────┘         │  ├─ Regulator  (request form)    │
             │                     │  ├─ Simulate   (violation test)  │
             │                     │  └─ Tracks     (bounty info)     │
             │                     └──────────────────────────────────┘
             │                                   ▲
             │                                   │ reads events
             ▼                                   │
┌─────────────────────────────────────────────────────────────────────┐
│                        BASE SEPOLIA (chain ID 84532)                │
│                                                                     │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────┐ │
│  │ LendingProtocol  │  │ ComplianceRegistry│  │  UltraVerifier   │ │
│  │ positions, root  │  │ reports, proofs   │  │  Noir BN254 Honk │ │
│  └────────┬─────────┘  └────────▲──────────┘  └────────▲─────────┘ │
│           │                     │                      │           │
└───────────┼─────────────────────┼──────────────────────┼───────────┘
            │ read positions      │ submitReport()       │ verify()
            ▼                     │                      │
┌─────────────────────────────────┼──────────────────────┼───────────┐
│          AUTONOMOUS AGENT (Python)                                  │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                         │
│  │ Watcher  │→ │ Analyst  │→ │ Reporter │  (Agno + Groq LLM)     │
│  │ monitor  │  │ decide   │  │ prove &  │                         │
│  │ state    │  │ actions  │  │ submit   │                         │
│  └──────────┘  └──────────┘  └────┬─────┘                         │
│                                    │                               │
│  ┌─────────────────────────────────┼───────────────────────────┐   │
│  │        Deterministic Pipeline (orchestrator.py)             │   │
│  │                                                             │   │
│  │  1. Read positions from LendingProtocol                     │   │
│  │  2. Build Poseidon2 Merkle tree (BN254)                     │   │
│  │  3. Commit position root on-chain                           │   │
│  │  4. Generate ZK proof (nargo execute + bb prove)            │   │
│  │  5. Submit report to ComplianceRegistry                     │   │
│  │  6. Fulfill pending RegulatorPortal requests                │   │
│  │  7. Package compliance dossier → Fileverse / local          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Optional integrations:                                            │
│  ├─ BitGo multi-sig wallet (tx signing)                            │
│  ├─ Fileverse (decentralized dossier storage)                      │
│  └─ ENSIP-25 (AI agent ENS verification)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What the ZK Circuit Proves

The Noir circuit (`circuits/collateral_proof/src/main.nr`) proves **four things** without revealing individual positions:

| # | Assertion | Why it matters |
|---|-----------|----------------|
| 1 | Each position's collateral/debt ratio ≥ `min_ratio_bps` | Prevents hiding one bad position in an otherwise healthy aggregate |
| 2 | Each position is tied to a public Merkle root via Poseidon2 | Proves the private data matches what's committed on-chain |
| 3 | Sum of private collaterals/debts = claimed public totals | Prevents fabricating aggregates |
| 4 | Aggregate ratio ≥ threshold (belt-and-suspenders) | Redundant top-level solvency check |

**Public inputs**: `positions_root`, `min_ratio_bps`, `total_collateral`, `total_debt`, `block_number`, `protocol_address`

**Private inputs**: 16 positions (collateral + debt), Merkle paths, Merkle indices

---

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| ComplianceRegistry | [`0xFbE3F85Ab541Cd538542B543E87706D00e1f7013`](https://sepolia.basescan.org/address/0xFbE3F85Ab541Cd538542B543E87706D00e1f7013) |
| RegulatorPortal | [`0x857597Ff99083c83C1c33165A61915236F20A888`](https://sepolia.basescan.org/address/0x857597Ff99083c83C1c33165A61915236F20A888) |
| LendingProtocol | [`0x5a73c532Fd82C5B2d1BE21d7acff51adfACaBc6f`](https://sepolia.basescan.org/address/0x5a73c532Fd82C5B2d1BE21d7acff51adfACaBc6f) |
| UltraVerifier | [`0x93362E57c5dBA158420c8db8CB4484b12f96bB84`](https://sepolia.basescan.org/address/0x93362E57c5dBA158420c8db8CB4484b12f96bB84) |
| MockWETH | [`0x9F22C578DFEC01Fa58DBDA1B49427Fdfb91B2b0F`](https://sepolia.basescan.org/address/0x9F22C578DFEC01Fa58DBDA1B49427Fdfb91B2b0F) |
| MockUSDC | [`0x1bb719EFd1bFffAa6D79c1e0512cb6D893144829`](https://sepolia.basescan.org/address/0x1bb719EFd1bFffAa6D79c1e0512cb6D893144829) |
| Agent Wallet | [`0xd707187453D29b8b3b017A02e4E6d6f6E5222017`](https://sepolia.basescan.org/address/0xd707187453D29b8b3b017A02e4E6d6f6E5222017) |

---

## Quick Start

### Prerequisites

- **Node.js** v18+ and **npm**
- **Python** 3.10+
- **Noir toolchain**: [nargo](https://noir-lang.org/docs/getting_started/installation/) >= 1.0.0
- **Barretenberg**: `bb` (UltraHonk prover/verifier)

### 1. Clone & Install

```bash
git clone https://github.com/Rohansingh3001/Provium.git
cd Provium/zkcomply
```

**Contracts:**
```bash
cd contracts
npm install
cp .env.example .env   # add your BASE_SEPOLIA_RPC + DEPLOYER_PRIVATE_KEY
npx hardhat compile
```

**Agent:**
```bash
cd agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add GROQ_API_KEY, AGENT_PRIVATE_KEY, BASE_SEPOLIA_RPC
```

**Dashboard:**
```bash
cd dashboard
npm install
cp .env.local.example .env.local   # add contract addresses
npm run dev
```

### 2. Compile the ZK Circuit

```bash
cd circuits/collateral_proof
nargo compile
# Generate the Solidity verifier (optional — already deployed)
bb write_vk -b target/collateral_proof.json
bb contract -k target/vk
```

### 3. Run the Agent

```bash
cd agent
source venv/bin/activate

# Verify setup
python verify_setup.py

# Single epoch (dry run)
python main.py --once --dry-run

# Single epoch (live on Base Sepolia)
python main.py --once

# Continuous loop (60s interval)
python main.py --interval 60
```

### 4. Run Integration Tests

```bash
cd agent
source venv/bin/activate
python test_bounty_integrations.py
```

### 5. Run the Demo

```bash
# Full regulator flow demo
python demo_regulator_flow.py

# Fake proof demo (skip nargo/bb — for quick testing)
python demo_fake_proof.py
```

---

## Bounty Integrations

### BitGo — Multi-sig Custody

ZK proof submissions are signed through BitGo's multi-sig wallet instead of a raw private key. This gives the compliance agent enterprise-grade transaction security with policy enforcement and audit trails.

| Feature | Status |
|---------|--------|
| BitGo REST API v2 client | `agent/tools/bitgo_tools.py` |
| Multi-sig tx signing | `agent/tools/submit_tools.py` (BitGo-first, eth_account fallback) |
| Wallet info & status | `get_bitgo_wallet_info()` |
| Policy enforcement | BitGo-side policies (velocity limits, whitelist) |
| Env-gated activation | `BITGO_ACCESS_TOKEN` + `BITGO_WALLET_ID` in `.env` |

**Setup:**
1. Create a wallet at [app.bitgo-test.com](https://app.bitgo-test.com)
2. Settings → Developer → Create Access Token
3. Add to `agent/.env`:
   ```
   BITGO_ACCESS_TOKEN=<your_token>
   BITGO_WALLET_ID=<your_wallet_id>
   ```

### Fileverse — Decentralized Evidence Storage

After each proof submission, the agent packages a **compliance dossier** — a rich JSON document containing proof metadata, tx hashes, agent reasoning, protocol snapshots, and timestamps — and uploads it to Fileverse (IPFS/Filecoin-backed).

| Feature | Status |
|---------|--------|
| Dossier builder | `build_compliance_dossier()` — schema `provium-compliance-dossier-v1` |
| Fileverse upload | `_upload_to_fileverse()` — REST API |
| Local fallback | `_save_to_local()` → `agent/dossiers/` |
| Dashboard link | "View Dossier" column in ProofTable |
| Integrity hash | SHA-256 content hash in every dossier |

**Setup:**
1. Get API access at [fileverse.io](https://fileverse.io)
2. Add to `agent/.env`:
   ```
   FILEVERSE_API_KEY=<your_key>
   FILEVERSE_NAMESPACE=<your_namespace>
   ```

### ENSIP-25 — AI Agent Registry

The agent registers its identity via ENS using the ENSIP-25 standard, allowing anyone to verify that `provium-agent.eth` is the legitimate operator of the ComplianceRegistry.

| Feature | Status |
|---------|--------|
| ERC-7930 address encoding | `encode_erc7930_address()` |
| Text record key builder | `get_ensip25_text_key()` |
| Dashboard badge | `Ensip25Badge.tsx` with verification hook |
| ENS integration | `provium-agent.eth` → ComplianceRegistry link |

---

## Security

| Threat | Mitigation | Location |
|--------|-----------|----------|
| Prompt injection via on-chain strings | `_sanitize_field()`, `_sanitize_jurisdiction()` strip control chars, enforce allowlists | `orchestrator.py` |
| LLM hallucinated request IDs | `known_request_ids` validation — agent only fulfills real pending requests | `orchestrator.py` |
| Fake compliance proofs | On-chain `UltraVerifier.verify()` — ZK proof MUST pass for `isCompliant=true` | `ComplianceRegistry.sol` |
| Raw private key exposure | BitGo multi-sig option — key never leaves HSM | `bitgo_tools.py` |
| Fileverse API failure | Graceful fallback to local dossier save — never blocks the core loop | `fileverse_tools.py` |

---

## Project Structure

```
zkcomply/
├── agent/                    # Autonomous compliance agent (Python)
│   ├── main.py               # CLI entry point
│   ├── orchestrator.py       # Deterministic 3-phase pipeline
│   ├── agents/               # LLM agents (Watcher, Analyst, Reporter)
│   ├── tools/                # On-chain tools, ZK proof, BitGo, Fileverse, ENSIP-25
│   └── dossiers/             # Local compliance dossier storage
├── circuits/                 # Noir ZK circuits
│   └── collateral_proof/     # Collateral ratio proof (Poseidon2 Merkle, UltraHonk)
├── contracts/                # Solidity smart contracts (Hardhat)
│   ├── src/                  # ComplianceRegistry, RegulatorPortal, LendingProtocol
│   ├── scripts/              # Deploy, seed, and setup scripts
│   └── deployments/          # Deployed addresses per network
├── dashboard/                # Regulator-facing Next.js dashboard
│   ├── app/                  # App Router pages
│   ├── components/           # React components (dashboard, landing, UI)
│   └── lib/                  # Hooks, contract ABIs, utilities
├── demo_regulator_flow.py    # End-to-end demo script
└── demo_fake_proof.py        # Quick demo without nargo/bb
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ZK Proofs | **Noir** (UltraHonk, BN254) + **Barretenberg** |
| Smart Contracts | **Solidity** (Hardhat, OpenZeppelin) |
| Chain | **Base Sepolia** (chain ID 84532) |
| Agent Framework | **Agno** + **Groq** (Llama 3.3 70B) |
| Merkle Tree | **Poseidon2** (BN254 field, matching Noir stdlib) |
| Dashboard | **Next.js** (App Router) + **wagmi** + **RainbowKit** + **Tailwind** |
| Custody | **BitGo** multi-sig (optional) |
| Evidence Storage | **Fileverse** IPFS/Filecoin (optional) |
| Agent Identity | **ENSIP-25** + **ERC-7930** |

---

## How It Works — Step by Step

1. **Watcher** reads all lending positions + pending regulator requests from Base Sepolia
2. **Analyst** evaluates risk levels and decides whether a proof is needed (routine, triggered, or regulator-requested)
3. **Reporter** executes the deterministic pipeline:
   - Builds a **Poseidon2 Merkle tree** over all positions (matching Noir's `poseidon2_permutation`)
   - Commits the **position root** on-chain (`LendingProtocol.commitPositionRoot()`)
   - Generates a **ZK proof** via `nargo execute` + `bb prove` (UltraHonk, EVM-verifiable)
   - Submits to **ComplianceRegistry** (proof verified on-chain by UltraVerifier)
   - Fulfills any pending **RegulatorPortal** requests within the 30-min deadline
4. **Dossier** is packaged and uploaded to **Fileverse** (or saved locally)
5. **Dashboard** reads on-chain events and displays proof history, compliance status, and agent activity

---

## License

MIT
