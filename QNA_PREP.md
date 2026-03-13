# Provium — Judge Q&A Prep Guide
### "Teach me everything from scratch"

> **How to use this:** Read each section top to bottom. Every section has three parts:
> 1. **What it is** — explained like you're talking to a smart person who's never heard of it
> 2. **How we use it** — exactly what it does in our project
> 3. **What a judge might ask + what to say**

---

## 🧠 THE BIG PICTURE FIRST

Before going into individual tools, understand what Provium does at a high level.

**The one-line version:**
> An AI agent watches a DeFi lending protocol 24/7 and generates mathematical proofs that it's compliant — without ever revealing the users' data.

**The three parts of the system:**
1. **Smart Contracts** (on the blockchain) — the protocol's positions live here. The agent writes proofs here.
2. **ZK Circuit** (the math engine) — takes private position data, runs checks, outputs a proof that the checks passed
3. **AI Agents** (the brain) — monitors the chain, decides when to act, runs the circuit, submits the proof

Everything connects: agents read the chain → build a proof → write it back to the chain → dashboard shows it live.

---

---

# SECTION 1: GROQ
**The judges here may be from Groq. Know this cold.**

---

## What is Groq?

Most AI companies (OpenAI, Anthropic, Google) run their AI models on **GPUs** — graphics cards originally designed for gaming.

Groq built a completely different kind of chip called an **LPU (Language Processing Unit)**. It's designed from scratch to run AI models as fast as possible.

**The analogy:** A GPU running AI is like using a Swiss Army knife to cut bread — it works, but it's not optimised for it. A Groq LPU is a bread knife. Same output, but dramatically faster and more consistent.

**Why it matters for compliance:** Our agent needs to run every 60 seconds. If the AI call takes 30 seconds on a slow GPU, the whole pipeline is slow. Groq's LPU produces responses in 1-3 seconds. That speed is the reason we can do real-time compliance.

---

## How We Use Groq

We use three Groq models — one for each agent:

### Model 1: `compound-beta` — used by the Watcher Agent
- This is Groq's **compound model** — it can autonomously call external tools (like searching the web) without being told to step by step
- Our Watcher uses it to search DuckDuckGo for OFAC sanctions updates automatically
- **Key point:** `compound-beta` is Groq's model that can "think and act" — it decides to make tool calls on its own

### Model 2: `llama-3.3-70b-versatile` — used by the Analyst Agent
- A 70-billion parameter open-source model (Meta's LLaMA 3.3) served through Groq
- "70b" means 70 billion parameters — the numbers inside the model that shape its reasoning
- We use it for the compliance decision: "given this chain data, what should we do?"

### Model 3 (implicit): Same for Reporter
- The reporter agent doesn't really use LLM reasoning — it calls tools directly. Python orchestrates it.

---

## What a Judge Might Ask

**"Why Groq over OpenAI?"**
> Speed and determinism. Our agent runs every 60 seconds in a financial compliance loop. Groq's LPU delivers 1-3 second inference consistently. A slow AI call breaks the real-time guarantee. Also: Groq serves open-source models like LLaMA 3.3 — we're not locked into a closed model. For a compliance system that regulators need to audit, model transparency matters.

**"What is compound-beta?"**
> Groq's compound model architecture — it autonomously orchestrates sub-calls. When we prompt it to check OFAC updates, it decides to call DuckDuckGo, synthesises what it finds, and returns a structured result. It's not scripted — the model decides the tool call strategy.

**"Why not just use GPT-4?"**
> We could. The agent framework (Agno) is model-agnostic. But Groq is 10-20x faster per token, and for a real-time compliance system that runs every minute, that latency difference is the difference between "real-time" and "batch processing."

**"What's an LPU vs a GPU?"**
> A GPU is general-purpose parallel compute — great for training, okay for inference. An LPU is designed specifically for inference — running a trained model to get output. It processes tokens sequentially with extremely low memory latency. The result: Groq can serve LLaMA 3.3 70b faster than most providers serve GPT-3.5.

---

---

# SECTION 2: NOIR + BARRETENBERG (ZK Proofs)
**The most technically complex part. Judges from Aztec labs may push hard here.**

---

## What is a Zero-Knowledge Proof?

Imagine you want to prove to someone that you know a secret password, **without telling them the password**.

That sounds impossible. But mathematically, it's not.

**A simple analogy — the magic cave:**
- There's a circular cave with a locked door in the middle
- You claim you know the combination to the lock
- The judge stands at the entrance, you go in one side, they call out which side you should come out of
- If you really know the combination, you can always come out the right side
- Repeat this 100 times — the probability you're faking it is 1 in 2^100 (essentially zero)
- The judge becomes statistically certain you know the combination **without ever learning what it is**

**In our project:**
- The "secret" = individual user positions (who borrowed what, their exact collateral amounts)
- The "proof" = mathematical evidence that ALL positions are above 150% collateral ratio
- The "judge" = the regulator (or anyone)
- **They get certainty the ratio is satisfied. They never see individual positions.**

---

## What is Noir?

Noir is a **programming language for writing ZK circuits**, built by Aztec Labs.

**What is a "circuit"?**
In normal programming, you write code that a computer runs step by step. In ZK, you write a "circuit" — a set of mathematical constraints that define what makes a proof valid.

Think of it like this:
- Normal code: "Add these numbers together and tell me the result"
- A ZK circuit: "Prove to me that you know two numbers that add up to 10, without telling me what the numbers are"

**Our circuit (`circuits/collateral_proof/src/main.nr`) does four things:**

```
1. Each of the 16 positions: collateral × 10000 ≥ debt × 15000
   (This is the 150% ratio check, individually for every user)

2. Each position is tied to the public Merkle root via Poseidon2 hashing
   (This prevents the agent from making up positions)

3. The sum of all private positions = the public total
   (You can't hide positions in the aggregate)

4. The aggregate ratio is also above 150%
   (Belt and suspenders)
```

If ANY of these `assert` statements fail, the proof cannot be generated. Not "the agent decides not to generate it" — it is **mathematically impossible** to produce a valid proof for failing state.

---

## What is Barretenberg?

Barretenberg (`bb`) is the **proving engine** — it's the software that takes your Noir circuit + your private inputs and generates the actual cryptographic proof.

**The analogy:** Noir is the recipe. Barretenberg is the chef who follows the recipe and produces the dish (the proof).

**Key terms:**
- **PlonK/UltraPlonK** — the specific ZK proof system used. This is the "type" of math being used to make proofs compact and fast to verify.
- **BN254** — the elliptic curve the math is done on. "BN254" refers to a curve with 254-bit numbers. The specific curve matters because it determines security and compatibility.
- **UltraVerifier.sol** — Barretenberg generates this Solidity smart contract directly from our circuit. It's a piece of code that can verify our proofs on-chain. We deployed it to Base Sepolia.

---

## What is Poseidon2?

Inside our circuit, we use **Poseidon2** as our hash function.

**Why not regular SHA256?**
SHA256 is great for normal computing. But inside a ZK circuit, you pay a "cost" in circuit complexity for each operation. SHA256 inside a ZK circuit is extremely expensive — it needs thousands of constraints.

Poseidon2 is a hash function **designed specifically for ZK circuits**. It's cheap inside circuits (few constraints) while remaining cryptographically secure. It's what Aztec and many other ZK systems use.

**In our circuit:**
- We hash each user's `(collateral, debt)` into a single number called a "leaf"
- We then combine leaves using a Merkle tree with Poseidon2 at each level
- The final combined hash is the "Merkle root" — a single number that represents ALL positions
- The Python agent builds the exact same tree using the same Poseidon2 parameters, so the roots match

---

## What is a Merkle Tree?

A Merkle tree is a way to take a big list of data and represent it as **one single number** (the root), such that:
- You can prove any item in the list is actually in the list, using just a few numbers (the "proof path")
- If anyone changes any item, the root changes completely

**The analogy:**
- You have 16 exam papers. Hash each one → 16 fingerprints.
- Combine pairs: hash(paper1, paper2), hash(paper3, paper4)... → 8 fingerprints.
- Combine those pairs again → 4 fingerprints.
- Again → 2. Then 1. That one number at the top is the **Merkle root**.
- A judge can verify paper #7 is genuine by giving them: the fingerprint of paper #7, and just 4 "sibling" fingerprints along the path to the root. They don't need all 16 papers.

**In our project:**
- The 16 "papers" are position hashes: `poseidon2(collateral, debt)` for each user
- We build a depth-4 Merkle tree (16 leaves → 8 → 4 → 2 → 1 root)
- The root gets committed on-chain: `commitPositionRoot(root, blockNumber)`
- The ZK circuit proves: "for every leaf, there exists a valid path from the leaf to this public root"

---

## What a Judge Might Ask (Noir/ZK/Aztec)

**"What proof system do you use?"**
> UltraPlonK, via Aztec's Barretenberg backend. The Noir compiler targets UltraPlonK which produces succinct proofs that verify in O(log n) time. We use the Barretenberg CLI (`nargo prove`) to generate proofs, and `regen_verifier.sh` generates the on-chain `UltraVerifier.sol` directly from our circuit.

**"Can the agent produce a valid proof for an undercollateralized state?"**
> No. The `assert` statements in the Noir circuit are hard constraints enforced by the Barretenberg proving system. If any position is below 150%, the `assert` fails and no valid proof can be generated. It's not a software check we can bypass — it's a mathematical constraint on the proof system. The same way you can't produce a valid SHA256 collision.

**"What is a Field in Noir?"**
> Noir operates on fields — numbers in a finite mathematical field, specifically the BN254 scalar field. All arithmetic happens modulo a large prime (about 2^254). This is why we need `as u128` casts for multiplications — some intermediate values could exceed the field prime and wrap around unexpectedly without the explicit type.

**"Why Poseidon2 and not Pedersen or MiMC?"**
> Poseidon2 has fewer constraints per hash than Pedersen commitments and is faster to prove than MiMC in our configuration. Noir's standard library has a native Poseidon2 builtin (`std::hash::poseidon2_permutation`) which matches the Barretenberg ACVM implementation exactly. Using the builtin avoids reimplementing the permutation and guarantees the Python and Noir hashes match.

**"What are public vs private inputs?"**
> In our circuit, private inputs are `positions_collateral` and `positions_debt` — the actual user position values. They are inputs to the proof but not revealed in the proof output. Public inputs (marked `pub` in Noir) are: `positions_root`, `min_ratio_bps`, `total_collateral`, `total_debt`, `block_number`, `protocol_address`. Anyone can see these. The regulator sees the public inputs (aggregates + the root) and gets a cryptographic guarantee that private inputs satisfying the circuit exist.

---

---

# SECTION 3: BASE (Coinbase L2)
**Judges from Base/Coinbase will know their chain cold.**

---

## What is Base?

Ethereum is slow and expensive. A transaction on Ethereum can cost $10-50 in fees and takes ~12 seconds to confirm.

**Layer 2 (L2)** chains are built on top of Ethereum to solve this. They batch thousands of transactions together, process them off of Ethereum, and then post a single compressed summary back to Ethereum. This makes transactions fast and cheap.

**Base** is a Layer 2 chain built by Coinbase. It uses the **OP Stack** — the same technology as Optimism. Key facts:
- Transactions cost ~$0.001 (vs $20 on Ethereum mainnet)
- Finality in ~2 seconds
- Inherits Ethereum's security — the final settlement is on Ethereum
- Backed by Coinbase — production-grade infrastructure

**Base Sepolia** is the testnet version of Base. Same behaviour, fake money.

---

## How We Use Base

All six of our smart contracts are deployed on Base Sepolia:

| Contract | Address | Purpose |
|---|---|---|
| `LendingProtocol` | `0x5a73c...` | Stores user positions (collateral, debt) |
| `RegulatorPortal` | `0x8575...` | Regulators submit compliance requests here |
| `ComplianceRegistry` | `0xFbE3...` | Agent submits proofs here. Permanent record. |
| `UltraVerifier` | `0x9336...` | Verifies ZK proofs on-chain |
| `MockWETH` | `0x9F22...` | Fake ETH token for testnet |
| `MockUSDC` | `0x1bb7...` | Fake USDC token for testnet |

**Why Base specifically?**
- Cheap gas for the agent (it transacts every 60 seconds — Ethereum mainnet would cost thousands per day)
- Coinbase integration means easy fiat on-ramp for future users
- EVM-compatible — our Solidity contracts work identically on Ethereum if we switch
- Fast block times mean the dashboard feels responsive

---

## What a Judge Might Ask (Base)

**"Why Base over Ethereum mainnet?"**
> Gas cost. Our compliance agent submits a transaction every 60 seconds — on mainnet that's $20+ per tx, thousands per day per protocol. On Base it's sub-cent. For a compliance product that protocols need running continuously, the economics only work on a fast, cheap L2. Base also has growing DeFi TVL and Coinbase's distribution reach for future protocol partnerships.

**"Is Base actually secure? It's a new chain."**
> Base uses the OP Stack with Ethereum as the settlement layer. Transaction data is posted to Ethereum in calldata (and soon blobs via EIP-4844). The security model is: as long as at least one honest party can submit a fraud proof within the 7-day challenge window, Base inherits Ethereum's security. Coinbase operates the sequencer but cannot steal funds — they can only censor, and the 7-day withdrawal window gives users recourse.

**"What is an RPC?"**
> RPC stands for Remote Procedure Call. It's how our Python agent talks to the blockchain. We point to `https://sepolia.base.org` — Base's public RPC endpoint — and fire calls like `getUserCount()`, `getPosition(addr)`, etc. It's essentially an API for reading and writing the blockchain.

**"What happens when the RPC is slow?"**
> We use exponential backoff retry in `_agent_response_text()` in `orchestrator.py` — 3 retries with waits of 1s, 2s, 4s. For production we'd use a dedicated Alchemy or Infura RPC endpoint with SLA guarantees instead of the public endpoint.

---

---

# SECTION 4: AGNO (Agent Framework)

---

## What is Agno?

Agno is a Python framework for building AI agents. Think of it as a toolkit that handles the plumbing so you can focus on what the agent does.

**Without Agno you'd have to:**
- Manually call the Groq API
- Manually handle tool call parsing (the LLM returns "call function X with args Y" as text — you'd parse that yourself)
- Manually manage retry logic
- Manually format prompts

**With Agno:**
```python
watcher_agent = Agent(
    model=Groq(id="compound-beta"),
    tools=[DuckDuckGoTools(), get_all_positions],
    instructions=["..."]
)
response = watcher_agent.run("Check OFAC updates")
```
Agno handles everything in between.

---

## How We Use It

We define three agents in `agent/agents/`:

- **`watcher.py`** — `compound-beta` model + DuckDuckGoTools + chain read tools
- **`analyst.py`** — `llama-3.3-70b-versatile` + decision-making instructions
- **`reporter.py`** — handles proof pipeline (mostly called directly from orchestrator)

**The key design decision (this is important for judges):**

We deliberately DON'T use Agno's multi-agent team feature to pass data between agents. Here's why, from the code comment:

> "Using an LLM team leader to pass data between agents causes it to *summarise* positions JSON instead of forwarding it verbatim. The Reporter then gets a text description instead of raw numbers, and the Merkle tree becomes wrong."

So `orchestrator.py` in Python extracts raw JSON from each agent's response and passes it directly to the next agent. **The LLMs do reasoning. Python does data passing.** For a financial system, this is the correct choice.

---

## What a Judge Might Ask (Agno)

**"Why Agno over LangChain or CrewAI?"**
> Agno is lightweight, model-agnostic, and has first-class Groq support. LangChain has a much larger abstraction layer — great for experimentation, harder to control exactly what's being passed to the model. CrewAI's multi-agent team approach would have the team leader LLM summarise data between agents, which breaks our Merkle tree. Agno gives us clean single-agent calls we orchestrate explicitly in Python.

**"Are these real agents or fancy API wrappers?"**
> Real agents in the meaningful sense: they have access to tools (chain reads, web search), they decide whether and when to call those tools, and they write different outputs every epoch based on live data. The Watcher genuinely calls DuckDuckGo and synthesises results. The Analyst reasons about health factors and decides urgency. A scheduler just runs fixed code. Our agents make decisions. But I'd also be honest: "agent" is an overloaded term — these are LLMs with tool access, not fully autonomous reasoning systems.

---

---

# SECTION 5: THE SMART CONTRACTS
**Solidity + Hardhat + OpenZeppelin**

---

## What is a Smart Contract?

A smart contract is a program that lives on the blockchain. Once deployed, nobody can change it, and it runs exactly as written — forever.

**Analogy:** A vending machine. You put in money, press a button, get a snack. The vending machine doesn't have a human deciding whether to give you the snack — it's mechanical and deterministic. Smart contracts are the same but for financial logic.

---

## Our Four Core Contracts

### `LendingProtocol.sol`
This is the mock DeFi lending protocol. In production, this would be Aave or Compound. For our demo:
- Users deposit WETH (collateral)
- Users borrow USDC (debt)
- It tracks positions, computes health factors
- Has a `triggerUndercollateralization()` function for demo — lets someone flash a position to zero to simulate a violation

**Health Factor** = (collateral value / debt) expressed as a ratio. Above 150% = compliant. Below 150% = violation.

### `RegulatorPortal.sol`
Regulators use this to submit on-chain compliance requests:
- "I am the SEC. I need proof that you were compliant at block #X. Deadline: 7 days."
- The agent sees this request, generates a proof for that block, calls `fulfillRequest()`.
- The regulator can verify the proof on-chain themselves — they don't need to trust Provium.

### `ComplianceRegistry.sol`
This is the permanent, immutable record of every proof the agent has ever submitted:
- Every 60 seconds, after proving, the agent calls `submitReport(proof, publicInputs, isCompliant, agentReasoning, ...)`
- The `agentReasoning` string — the LLM's plain-English explanation — is stored on-chain forever
- Anyone can read this. Regulators. Auditors. Judges. 10 years from now.

### `UltraVerifier.sol`
Generated directly by Barretenberg from our Noir circuit. This contract has one job:
- Take a proof + public inputs
- Return `true` if valid, revert if not
- It is called inside `submitReport()` on the ComplianceRegistry — invalid proofs cannot be recorded

---

## What is Hardhat?

Hardhat is a development environment for Ethereum smart contracts. We use it to:
- Compile our Solidity contracts into bytecode the EVM understands
- Run deployment scripts (`scripts/deploy.ts`) that send the compiled contracts to Base Sepolia
- The `deployments/base-sepolia.json` file is the output — it records the deployed addresses

**OpenZeppelin** is a library of pre-audited, production-ready smart contract components. We use their `Ownable` pattern (access control — only the agent wallet can submit reports) and `ReentrancyGuard` (prevents attack where a malicious contract calls back into ours mid-execution).

---

## What a Judge Might Ask (Smart Contracts)

**"How does the on-chain proof verification work?"**
> `ComplianceRegistry.submitReport()` calls `UltraVerifier.verify(proof, publicInputs)` before storing anything. If the proof is invalid, the call reverts — the violation or compliance report never gets written. The UltraVerifier was generated by `bb write_vk` and `bb contract` from our compiled Noir circuit. It's not custom code — it's Barretenberg's output for our specific circuit.

**"What stops the agent from submitting a fake 'compliant' report?"**
> The on-chain UltraVerifier. The agent calls `submitReport(proof, inputs, isCompliant=true, ...)`. The registry passes the proof to UltraVerifier which mathematically validates it. If the positions were actually undercollateralized, the Noir circuit's `assert` would have failed during proving — no valid proof exists for that state. The agent cannot construct a valid proof for a failing state any more than it can invert a hash function.

**"What is a reentrancy attack?"**
> When contract A calls contract B, and B's code calls back into A before A finishes executing — potentially exploiting an intermediate state. `ReentrancyGuard` from OpenZeppelin adds a mutex (a lock) that prevents this. Standard practice for any contract handling funds.

---

---

# SECTION 6: NEXT.JS DASHBOARD
**The frontend — Next.js, wagmi, RainbowKit, TanStack Query**

---

## What is Next.js?

Next.js is a React framework — it handles the web app structure so you focus on building pages. We use "App Router" — Next.js 14's way of organising pages as folders.

Our dashboard has three main routes:
- `/dashboard` — overview, recent proofs, health factors
- `/dashboard/regulator` — submit compliance requests, see request history
- `/dashboard/violations` — violation simulator

---

## What is wagmi?

wagmi is a React library for connecting to Ethereum. It provides React hooks (reusable pieces of logic) for:
- Reading data from contracts: `useReadContract({ functionName: 'getUserCount' })`
- Writing transactions: `useWriteContract()`
- Watching events: `useWatchContractEvent()` — this is what powers live updates

**Example from our code:**
```typescript
// This watches Base Sepolia in real-time for ViolationRecorded events
// The moment the agent writes a violation, the UI updates automatically
useWatchContractEvent({
    address: ADDRESSES.ComplianceRegistry,
    eventName: 'ViolationRecorded',
    onLogs() { setStep('recorded') }
})
```
No page refresh needed. The dashboard subscribes to blockchain events like a websocket.

---

## What is RainbowKit?

RainbowKit is a wallet connection UI library. It gives you that polished "Connect Wallet" modal with support for MetaMask, Coinbase Wallet, WalletConnect, etc. in about 5 lines of code.

---

## What is TanStack Query?

TanStack Query (formerly React Query) manages data fetching and caching. We configure it to:
- `staleTime: 30s` — don't re-fetch for 30 seconds (matches one Base Sepolia block)
- `gcTime: 5min` — keep cached data for 5 minutes
- Exponential retry — if an RPC call fails, retry with increasing delays

---

## What a Judge Might Ask (Dashboard)

**"How does the dashboard update in real-time without refreshing?"**
> wagmi's `useWatchContractEvent` hook opens a subscription to the Base Sepolia RPC using eth_subscribe (websocket). When the agent submits a proof on-chain, the `ReportSubmitted` event fires, our hook catches it, Sonner (toast library) shows a notification, and TanStack Query invalidates the relevant cache keys triggering a fresh read. No polling. No page refresh.

**"What is an event in Solidity?"**
> A cheap way for smart contracts to emit logs that are stored on the blockchain but not in contract storage. In `ComplianceRegistry`, after every `submitReport()`, we emit `ReportSubmitted(reportId, isCompliant, ratioBps, agentReasoning)`. These logs are indexed and queryable. Our dashboard subscribes to them. Explorers like Basescan also display them.

---

---

# SECTION 7: THE AGENT LOOP — END TO END

This is the most important section. Know it cold. This is what's actually running.

---

## One Epoch, Step by Step

Every 60 seconds, `run_epoch()` in `orchestrator.py` runs:

### Phase 1: Watcher
1. Python calls `get_all_positions()` directly → reads `LendingProtocol` on Base Sepolia → gets all 16 positions
2. Python calls `get_pending_regulator_requests()` → reads `RegulatorPortal` → are there regulator requests waiting?
3. Python calls `get_latest_compliance_report()` → reads `ComplianceRegistry` → how old is our last proof?
4. Watcher LLM (`compound-beta`) is called with all this data + asked to search DuckDuckGo for OFAC news
5. Watcher returns: `{ risk_level: "low", ofac_news: "No new sanctions...", summary: "..." }`

### Phase 2: Analyst
1. Analyst LLM (`llama-3.3-70b`) is called with the watcher's output
2. It reasons: hours since last proof? health factors? any regulator requests?
3. Returns a list of actions: `[{ urgency: "routine", agent_reasoning: "All 5 positions above 150%...", request_id: 0 }]`
4. If LLM fails → Python fallback logic decides deterministically (no LLM needed)

### Phase 3: Reporter (for each action)
1. **Build Merkle tree** — Python takes all positions, computes Poseidon2 hashes, builds depth-4 tree → gets `root`
2. **Commit root on-chain** — agent wallet calls `LendingProtocol.commitPositionRoot(root, blockNumber)` → tx on Base Sepolia
3. **Generate ZK proof** — writes `Prover.toml` with positions + Merkle paths, runs `nargo prove` (30-120 seconds) → reads proof file
4. **Submit proof** — agent calls `ComplianceRegistry.submitReport(proof, inputs, isCompliant, totalCollateral, totalDebt, ratioBps, agentReasoning, trigger, requestId)` → `UltraVerifier` validates on-chain → proof stored permanently
5. **Fulfill regulator request** (if applicable) — calls `RegulatorPortal.fulfillRequest(requestId, proof, inputs, agentReasoning)`

---

## The Cache Layer (diskcache)

Every `get_all_positions()` call makes ~16 RPC calls (one per user). If the Watcher, Analyst, and Reporter all call it, that's 48 RPC calls in one epoch.

`diskcache` (SQLite on disk) caches results:
- `get_all_positions` → 30s TTL (one block time — fresh data every epoch, no redundant reads within an epoch)
- `get_pending_regulator_requests` → 15s TTL (more urgent, checked more often)

No Redis. No extra infrastructure. Runs in-process.

---

---

# SECTION 8: KEY NUMBERS TO KNOW

Judges love specifics. Have these ready:

| Fact | Number |
|---|---|
| Agent wallet address | `0xd707187453D29b8b3b017A02e4E6d6f6E5222017` |
| Deployed block | 38272672 (Base Sepolia) |
| Minimum compliance ratio | 150% (15000 bps) — from GENIUS Act |
| Circuit tree size | 16 positions (depth 4) |
| Proof generation time | 30–120 seconds (nargo prove) |
| Agent epoch interval | 60 seconds (configurable) |
| Cache TTL positions | 30 seconds |
| Cache TTL requests | 15 seconds |
| LLM retry attempts | 3 (backoff: 1s, 2s, 4s) |
| nargo version | 1.0.0-beta.19 |
| Barretenberg version | 4.0.0-nightly |
| Hardhat network | Base Sepolia (chain ID 84532) |

---

---

# SECTION 9: THE THREE QUESTIONS YOU'LL DEFINITELY GET

### Q1: "Can you fake the proof?"
**Say this:**
> No. The `assert` statements in our Noir circuit are mathematical constraints enforced by the Barretenberg proving system. If any position is below 150%, the circuit constraints are not satisfied, and Barretenberg cannot produce a valid proof — it's mathematically impossible, the same way you can't invert SHA256. Even if you tried to submit a fake proof, the on-chain `UltraVerifier.verify()` — generated directly from our circuit by Barretenberg — would reject it and revert the transaction. The agent cannot cheat. Mathematics enforces it.

### Q2: "Is the OFAC check cryptographic?"
**Say this:**
> Provium has two compliance layers. The **ZK layer** is cryptographic: it proves ratio invariants over private position data with mathematical guarantees. The **OFAC surveillance layer** is AI-assisted: the Watcher agent searches the live OFAC SDN list every 60 seconds via DuckDuckGo and writes its findings permanently on-chain. In 40 hours we prioritised making the ZK layer complete and correct — the hard cryptographic problem. A full ZK non-membership proof (proving no user is on the OFAC Merkle tree) is our mainnet Sprint 2: add address inputs, non-membership path constraints to the circuit, recompile, redeploy the verifier. We know exactly what that looks like. We chose not to half-ship it at a hackathon.

### Q3: "What's the architecture of the agent?"
**Say this:**
> Three Agno agents backed by Groq. The Watcher uses `compound-beta` — Groq's compound model that autonomously calls tools — to monitor chain state and OFAC news. The Analyst uses `llama-3.3-70b-versatile` to decide what actions to take. The Reporter executes the proof pipeline. Critically, we orchestrate them in Python, not with an LLM team leader. Why? An LLM coordinator would summarise our positions JSON instead of forwarding it verbatim, breaking the Merkle tree. For a financial compliance system, we need bit-exact data passing between steps. Python handles data. LLMs handle reasoning.

---

---

# SECTION 10: GLOSSARY — ONE-LINE DEFINITIONS

If a judge uses a word you don't recognise:

| Term | What it means |
|---|---|
| **BN254** | The elliptic curve our ZK math runs on. 254-bit security. |
| **PlonK / UltraPlonK** | The ZK proof system. Produces small proofs that verify fast. |
| **Prover** | The software that generates a ZK proof (us: Barretenberg/nargo) |
| **Verifier** | The software/contract that checks a ZK proof (us: UltraVerifier.sol on-chain) |
| **Witness** | The private inputs to the circuit (positions, collateral, debt) |
| **Public inputs** | The values revealed in the proof (root, totals, block number) |
| **Merkle root** | One number that represents a whole tree of data. Changes if any data changes. |
| **Health factor** | Collateral value / debt. Must stay above 150% or liquidation happens. |
| **bps (basis points)** | 1 bps = 0.01%. So 15000 bps = 150%. |
| **EVM** | Ethereum Virtual Machine — the computer all Ethereum/Base smart contracts run on |
| **ABI** | Application Binary Interface — the "menu" of functions a smart contract exposes |
| **Calldata** | Data sent with a transaction to a contract |
| **OFAC SDN** | Office of Foreign Assets Control, Specially Designated Nationals — the US sanctions list |
| **TVL** | Total Value Locked — how much money is in a DeFi protocol |
| **L2** | Layer 2 — a chain built on top of Ethereum that inherits its security but is faster/cheaper |
| **Sequencer** | The server that orders transactions on an L2 before posting them to Ethereum |
| **LPU** | Language Processing Unit — Groq's custom chip for AI inference |
| **Inference** | Running a trained AI model to get output (vs training, which teaches the model) |
| **Hook (React)** | A reusable piece of logic in a React component (wagmi hooks: `useReadContract`, etc.) |
| **diskcache** | SQLite-backed cache library. We use it to cache chain reads with TTLs. |

---

> **Final tip:** If a judge asks something you genuinely don't know the answer to, say:
> *"That's getting into specifics I'd want to double-check before answering confidently — what I can tell you is how it works in our implementation: [explain what you built]."*
>
> Honesty about the boundary of your knowledge is always better than a confident wrong answer to a judge who knows the subject.
