# Provium — System Architecture

> One document to understand how every piece connects.

---

## Repository Layout

```
zkcomply/
├── agent/          # Python — three Groq AI agents + orchestrator
├── circuits/       # Noir — ZK circuit (BN254 Poseidon Merkle)
├── contracts/      # Solidity — four smart contracts on Base Sepolia
├── dashboard/      # Next.js 14 — live frontend + regulator portal
│
├── ARCHITECTURE.md         ← you are here
├── AGENT.md                ← agent module deep-dive
├── CIRCUITS.md             ← ZK circuit deep-dive
├── CONTRACTS.md            ← smart contracts deep-dive
├── DASHBOARD.md            ← frontend deep-dive
│
├── regen_verifier.sh       # regenerate UltraVerifier.sol from circuit
├── PITCH.md                # hackathon pitch document
└── README.md               # quick start
```

---

## The Problem This Solves

DeFi protocols must prove compliance with OFAC sanctions rules and the GENIUS Act (≥ 150% collateral ratio) — but the only existing tools require handing raw user data to regulators. That violates GDPR and user trust.

**Provium's solution:** Use Zero Knowledge proofs so a protocol can prove it is compliant mathematically, with no user data ever leaving the system.

---

## System Overview

```
                        ┌─────────────────────────────────┐
                        │          AGENT (Python)          │
                        │                                  │
  [DuckDuckGo / OFAC]──▶│  Watcher ──▶ Analyst ──▶ Reporter│
                        │                    │              │
                        └────────────────────┼──────────────┘
                                             │
                        ┌────────────────────▼──────────────┐
                        │        CIRCUITS (Noir / nargo)     │
                        │  Poseidon2 Merkle + 4 assert rules │
                        │  → proof_hex (BN254 PlonK proof)   │
                        └────────────────────┬──────────────┘
                                             │
                        ┌────────────────────▼──────────────┐
                        │       CONTRACTS (Solidity)         │
                        │  LendingProtocol  (chain state)    │
                        │  ComplianceRegistry (proofs + AI)  │
                        │  RegulatorPortal  (requests)       │
                        │  UltraVerifier    (on-chain verify) │
                        └────────────────────┬──────────────┘
                                             │
                        ┌────────────────────▼──────────────┐
                        │       DASHBOARD (Next.js 14)       │
                        │  Live proof table — toast events   │
                        │  Regulator portal — violation sim  │
                        └───────────────────────────────────┘
```

---

## End-to-End Data Flow — One Epoch

Every 60 seconds the agent runs one **epoch**. Here is exactly what happens:

| Step | Who | What |
|------|-----|-------|
| 1 | `orchestrator.py` | Calls `get_all_positions()` via Web3 → reads live lending state from `LendingProtocol.sol` |
| 2 | **Watcher** (Groq `compound-beta`) | Searches DuckDuckGo for OFAC updates. Returns `risk_level` + `ofac_news`. |
| 3 | **Analyst** (Groq `llama3-groq-70b-8192-tool-use`) | Reads Watcher report. Decides urgency. Writes `agent_reasoning` string (will be stored on-chain). |
| 4 | `proof_tools.py` | Builds Poseidon2 Merkle tree from positions. Writes `Prover.toml`. Calls `nargo prove`. |
| 5 | `contracts/` | Commits Merkle root on-chain, then submits `proof_hex` + `agent_reasoning` to `ComplianceRegistry`. `UltraVerifier.sol` rejects any invalid proof. |
| 6 | **Dashboard** | `useWatchContractEvent` fires → toast notification. Proof table updates. No refresh needed. |

---

## Key Design Decisions

### Why Python orchestrates, not an LLM team leader

Using an LLM to pass data between agents causes it to *summarise* positions JSON instead of forwarding it verbatim. The Reporter then gets a text description rather than raw numbers, and the Merkle tree becomes wrong. Python wires raw JSON between agents. LLMs handle reasoning only.

### Why diskcache (SQLite), not Redis

No extra infrastructure. `get_all_positions` has a 30s TTL matching one Base Sepolia block epoch. The cache eliminates redundant RPC calls within a single agent run without serving stale data across epochs. Falls back to a plain in-memory dict if diskcache is not installed.

### Why UltraVerifier rejects on-chain, not just off-chain

The agent literally cannot fake a proof. The Noir circuit `assert` constraints are enforced by the Barretenberg proving system. `UltraVerifier.sol` — generated directly from the circuit by `regen_verifier.sh` — calls the BN254 PlonK verifier. Submitting a false proof for a compliant state is cryptographically impossible.

### Why testnet, not mainnet

Mainnet requires auditing real user funds. That is a six-month process, not a hackathon. The hard problem was the ZK + agent architecture. Switching to mainnet is one line in `hardhat.config.ts` and one env variable.

---

## Module Docs

- **[AGENT.md](AGENT.md)** — orchestrator, agents, tools, cache
- **[CIRCUITS.md](CIRCUITS.md)** — Noir circuit, Merkle tree, Prover.toml
- **[CONTRACTS.md](CONTRACTS.md)** — all four Solidity contracts, deployment
- **[DASHBOARD.md](DASHBOARD.md)** — Next.js 14 app, real-time events, pages
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** — how a DeFi protocol company adopts Provium end-to-end
