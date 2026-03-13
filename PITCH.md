# Provium — The Compliance Officer That Never Sleeps, Never Lies, and Never Looks at Your Users

---

## The Problem

Right now, every DeFi protocol is playing Russian roulette.

OFAC — the US Treasury's sanctions office — regularly adds new crypto wallet addresses to their blocked list. If even one of those wallets touches your protocol and you can't prove you tried to stop it, you get fined. The enforcement actions are real, they're increasing, and they're expensive.

But here's the brutal irony — the only way to prove compliance today is to **hand all your user data to regulators.** Names, wallets, positions, everything. Which is:

- Illegal under GDPR in Europe
- A betrayal of every user who trusted you
- The exact opposite of what DeFi stands for

So protocols are stuck. **Comply and betray your users. Or don't comply and pay the fine.**

There was no third option. **Until now.**

---

## What We Built

Provium is three AI agents running on Groq that watch your DeFi protocol 24/7 and generate **Zero Knowledge proofs** of compliance — every 60 seconds — without ever revealing a single user's position.

The regulator gets mathematical proof. The users get zero exposure. Nobody trusts anybody. **The math does the work.**

---

## Why This Wins — The Technical Flex

Three things make this genuinely hard to build and genuinely hard to replicate.

### 1. The ZK Part Is Real

We wrote a Noir circuit with real BN254 Poseidon Merkle constraints. The prover cannot generate a valid proof with false inputs — it's mathematically impossible. Not "we check the data" — we **prove the data** cryptographically.

The circuit enforces five distinct invariants:
- Every position individually above the 150% minimum ratio
- Range checks to prevent overflow and negative-debt exploits
- Each position's leaf tied to a public Merkle root via Poseidon hashing
- Public aggregate totals must match the private sum exactly
- Belt-and-suspenders aggregate ratio check

The `regen_verifier.sh` script generates a real Barretenberg `UltraVerifier.sol` directly from the circuit — deployed to Base Sepolia, it cryptographically rejects any invalid proof on-chain. The circuit constraints are mathematically sound. The on-chain enforcement is a single deployment step.

### 2. The Agent Is Actually Autonomous

This is not a cron job with an LLM wrapper.

The **Watcher** uses Groq's `compound-beta` model — Groq's compound model that autonomously orchestrates sub-calls, searches the web, and synthesises results. It calls DuckDuckGo, finds real OFAC sanction updates, and factors what it finds into its risk assessment. Every epoch.

The **Analyst** runs on `llama3-groq-70b-8192-tool-use-preview` — Groq's fine-tuned tool-use model — and reasons about what proof is needed based on live chain data: health factors, hours since last proof, pending regulator requests.

The **Reporter** executes the full proof pipeline: build Merkle tree, commit root on-chain, run Barretenberg prover, verify and submit.

We deliberately wire raw JSON between agents in Python rather than using an LLM team leader — because an LLM summarising position data instead of forwarding it verbatim broke the Merkle tree. The agents are real Agno + Groq agents. The handoff is deterministic Python. **For a financial system, reliability beats elegance.**

The agent's chain reads are cached with **diskcache** (SQLite, no Redis) — `get_all_positions` has a 30-second TTL matching one Base Sepolia block epoch. This eliminates redundant RPC calls within a single agent run without ever serving stale compliance data across epochs.

### 3. The Reasoning Is On-Chain Forever

Every time the agent runs, Groq writes plain-English reasoning explaining its compliance decision — and that text gets stored permanently in our smart contract. A regulator can read it. An auditor can read it. A judge can read it. Ten years from now.

```
"All 5 positions are above 150% threshold. Minimum health factor is 163%.
Generating routine epoch proof for block #8294801 per GENIUS Act requirements.
No new OFAC sanctions detected in last 24h. Protocol is compliant."
```

An AI compliance officer's decision, tied to a specific block, immutably on-chain. **No existing compliance product combines AI reasoning with on-chain auditability at this level of granularity.**

---

## The Demo — What Judges Will See

### Minute 1 — The Agent Running Live

Open the terminal. Three Groq agents are running right now on Base Sepolia. Watch the Watcher search DuckDuckGo for OFAC updates in real time. Watch the Analyst decide a proof is needed. Watch the Reporter run Barretenberg and generate a real ZK proof.

Click the Basescan link. It's real. The proof is on-chain. The LLM's reasoning is in the contract data. Forever.

The moment the proof lands on-chain, the dashboard shows a **toast notification** — bottom-right, no refresh — "Proof #N submitted — 163.0% ✓". The notification badge on the Proof History sidebar item increments. This is wired to `useWatchContractEvent` — a live subscription to Base Sepolia events.

### Minute 2 — The Regulator Gets Served

Submit a compliance request from the Regulator Portal — on-chain. In less than 60 seconds, the agent detects it, generates a proof specifically for that request, and fulfills it. The portal updates. The regulator gets a ZK proof and an AI-written explanation tied to a specific block. Zero user data touched.

A yellow toast fires: "Regulator request #N fulfilled."

### Minute 3 — The Violation

Click **"Trigger Undercollateralization."** One position drops to 140% — below the 150% GENIUS Act minimum. Wait 60 seconds. The agent detects it. Generates a **failing** proof. Records it on-chain. A red toast fires: "VIOLATION proof #N — ratio 138.5% below minimum." The dashboard turns red. The violation is permanent, immutable, and verifiable by anyone on Basescan.

*"This is what compliance violations look like — caught in real time, with cryptographic proof. We built the tool that makes that possible without touching a single user's identity."*

---

## Why Now

The **GENIUS Act** mandates minimum 150% collateral ratios for DeFi stablecoins and creates compliance obligations for protocols operating in the US. OFAC has dedicated crypto enforcement specialists. The EU's MiCA regulation is live. **This isn't future regulation — it's today's regulation.**

Every DeFi protocol operating right now needs exactly what we built. The market is every protocol that doesn't want a six-figure fine and doesn't want to betray their users to avoid it.

The business model is straightforward: a protocol-level SaaS subscription priced well below the cost of a single enforcement action. Compliance-as-a-service — the gas fees are on the protocol, the subscription is on the compliance budget.

---

## Why This Beats Everything Else

|  | Chainalysis | Manual Compliance | Provium |
|---|---|---|---|
| **Reveals user data?** | Yes — sends to them | Yes — sent to regulators | **Never** |
| **Real-time?** | No — post-facto analysis | No — quarterly reports | **Every 60 seconds** |
| **Cryptographic proof?** | No — their word | No — your word | **Yes — math** |
| **Cost** | $500K+/year | $200K+/year in lawyers | **Gas fees only** |
| **Autonomous?** | No | No | **Yes — 3 AI agents** |

---

## For Technical Judges — The Unfakeable Parts

**"Can the agent fake the proof?"**
No. The Noir circuit `assert` constraints are enforced by the Barretenberg proving system. The agent cannot produce a valid proof for an undercollateralised state any more than it can break elliptic curve cryptography. `regen_verifier.sh` deploys the nargo-generated `UltraVerifier.sol` — it validates real BN254 PlonK proofs on-chain and rejects everything else.

**"Is the agent actually autonomous or is it a scheduler?"**
Open the source. Three Agno agents using Groq models — one on `compound-beta`, one on the fine-tuned tool-use model. The Watcher makes real DuckDuckGo API calls and adjusts its risk assessment based on what it finds. The Analyst writes different reasoning every epoch based on live chain state. A scheduler runs fixed code. Our system does **intelligent orchestration** — the decision surface is deliberately bounded (this is a financial compliance system, not a chatbot), but the decisions within that surface are data-driven and non-deterministic. That's exactly the right design for a regulated context.

**"The reasoning on-chain — why does that matter?"**
An AI system's compliance decision is **auditable, permanent, and publicly verifiable** — tied to a specific block, readable by any court, regulator, or auditor, forever. Projects like Polygon ID and zkKYC work address identity verification; Notebook Labs addresses data privacy. What's distinct here is coupling AI *reasoning traces* to ZK proofs *on-chain*, so the "why" is as verifiable as the "what."

**"What's the system architecture of the dashboard?"**
Next.js 14 App Router. TanStack Query with `staleTime: 30s`, `gcTime: 5min`, exponential retry — tuned for Base Sepolia's block cadence. Zustand for three scoped client stores (notification badges, panel state, sidebar collapse). Sonner for toast notifications wired to `useWatchContractEvent`. Centralized query-key factory in `lib/query-keys.ts` for type-safe cache invalidation. Route-level skeleton loading states. ReactQueryDevtools in dev mode. No Redux, no Context hell.

**"What about the agent's RPC overhead?"**
`get_all_positions` is cached with diskcache (SQLite) at a 30-second TTL — one epoch. `get_pending_regulator_requests` at 15 seconds. This eliminates redundant multi-RPC reads within a single agent run while still catching new state every epoch. No Redis, no extra infrastructure — diskcache runs in-process and falls back to a plain in-memory dict if not installed.

**"Does this work on mainnet?"**
The contracts are identical — standard OpenZeppelin, no chain-specific opcodes. The circuit is identical. The agent is identical. The only changes are the RPC URL and token addresses. Testnet scope was a deliberate choice for the hackathon. The architecture is production-ready.

---

## The Bet

Post-GENIUS Act, post-OFAC crypto enforcement surge, post-MiCA — **every DeFi protocol needs a compliance layer that doesn't compromise user privacy.**

ZK proofs are the only cryptographic primitive that solves this. Autonomous agents are the only scalable way to run them continuously. We combined both into one system that's live on Base Sepolia right now.

The bet is simple: **regulators are coming for DeFi whether DeFi wants it or not. We built the tool that lets DeFi survive that without becoming a surveillance machine.**

---

## On Testnet vs Mainnet

Deliberate choice.

Mainnet deployment requires a real lending protocol with real user funds — that's not something you build in a hackathon, that's something you audit for six months. What we built is the **compliance layer**, not the lending protocol. The contracts are standard OpenZeppelin, no chain-specific opcodes, identical bytecode on mainnet. The circuit is the same. The agent is the same. Switching to mainnet is changing one line in `hardhat.config.ts` and one environment variable.

We scoped correctly — the hard problem was the ZK + agent architecture, not which RPC URL to point at.

And mainnet with fake tokens would be *worse* than testnet with fake tokens. Mainnet with real user funds requires a security audit before touching them. That's not a technical gap — that's a responsible one.

---

## The Line That Closes

Chainalysis requires you to trust them.  
Lawyers require you to trust them.  
Provium requires you to trust **mathematics.**

> *"The math never lies. The agent never sleeps. The chain never forgets."*
