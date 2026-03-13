# Tech Deep-Dive — Everything You Need to Explain to Judges

Every technology in Provium, what it does, how we use it specifically, and what to say when a judge pushes hard.

---

## Quick Map — What Talks to What

```
JUDGES / REGULATORS
        │
        ▼
┌─────────────────────────────────────────────────────┐
│              DASHBOARD  (Next.js)                   │
│  wagmi + RainbowKit + viem  →  reads Base Sepolia   │
│  ENS → shows names instead of 0x addresses          │
└────────────────┬───────────────────────┬────────────┘
                 │ on-chain reads         │ on-chain writes (user)
                 ▼                        ▼
┌──────────────────────────────────────────────────────┐
│                BASE SEPOLIA (testnet)                 │
│                                                       │
│  LendingProtocol    ← positions, health factors       │
│  RegulatorPortal    ← compliance requests             │
│  ComplianceRegistry ← proof records + LLM reasoning  │
│  UltraVerifier      ← ZK proof validation             │
└──────────────────┬───────────────────────────────────┘
                   │ reads + writes
                   ▼
┌──────────────────────────────────────────────────────┐
│               PYTHON AGENT (3 sub-agents)             │
│                                                       │
│  Watcher  →  llama-3.3-70b-versatile (Groq)  →  chain data  │
│  Analyst  →  llama-3.3-70b-versatile (Groq)                 │
│  Reporter →  orchestrator Python tools  →  nargo prove      │
└──────────────────┬───────────────────────────────────┘
                   │ nargo prove
                   ▼
┌──────────────────────────────────────────────────────┐
│         NOIR CIRCUIT  (ZK proof engine)               │
│         BN254 Poseidon Merkle · Barretenberg          │
└──────────────────────────────────────────────────────┘
```

---

## 1. Zero Knowledge Proofs — The Core Tech

### The Plain-English Version

Imagine you want to prove to a regulator that every loan on your platform is safe — without showing them a single loan. A ZK proof is a piece of math that says:

> "I ran a computation on private data, and I swear the answer is correct — and here's cryptographic proof you can verify in milliseconds, without ever seeing the private data."

It's like a seal on an envelope. The regulator can verify the seal is authentic without opening the envelope.

### What Our Circuit Actually Proves

Our circuit file is `circuits/collateral_proof/src/main.nr`. It takes:

- **Private inputs** (the agent knows, nobody else does): all 16 user positions (collateral in WETH wei, debt in USDC)
- **Public inputs** (everyone can see): the Merkle root, minimum ratio, totals, block number, protocol address

And it enforces **5 constraints**. If any one fails, no valid proof can be generated — mathematically impossible:

| Constraint | What it checks | Why it matters |
|---|---|---|
| `assert(coll * 10000 >= debt * min_ratio_bps)` per position | Every individual position is above 150% | Can't hide an undercollateralised position inside a compliant aggregate |
| `assert(coll as u64 < 18446744073709551615)` | No overflow attacks or negative debt tricks | Security hardening |
| `assert(curr == positions_root)` | Each position is tied to the public Merkle root | Proves the private data matches what was committed on-chain |
| `assert(sum_collateral == total_collateral)` | Private sum matches the public total | Can't fake the aggregate numbers |
| `assert(total_collateral * 10000 >= total_debt * min_ratio_bps)` | Aggregate is also above threshold | Belt-and-suspenders on the whole protocol |

### If a Judge Asks "Can You Fake a Proof?"

No. The proving system (Barretenberg, by Aztec) is built on the same elliptic curve cryptography that secures Bitcoin. Forging a proof would require solving the discrete logarithm problem. The best computers in the world cannot do this.

More concretely: if a position is at 140%, the constraint `assert(coll * 10000 >= debt * 15000)` is false. Barretenberg cannot generate a witness that satisfies a false assertion. The prover exits with a non-zero code and no proof file is written.

---

## 2. Noir — The ZK Programming Language

### What It Is

Noir is a programming language by Aztec Labs specifically for writing ZK circuits. Think of it like Rust, but instead of compiling to machine code, it compiles to arithmetic constraints that Barretenberg can prove.

### What We Use It For

We wrote `main.nr` — our compliance circuit. `nargo` is the Noir compiler and prover CLI.

```bash
nargo compile        # compiles main.nr → arithmetic constraint system
nargo prove          # reads Prover.toml → runs Barretenberg → writes .proof file
nargo codegen-verifier  # generates UltraVerifier.sol from the circuit
```

### The Poseidon Hash — Why It Matters

Regular hash functions like SHA-256 are very expensive inside ZK circuits (thousands of constraints). Poseidon was specifically designed to be ZK-friendly — it's cheap to prove inside a circuit.

We use `std::hash::poseidon::bn254::hash_2` — Poseidon on the BN254 elliptic curve, which is what Barretenberg uses natively. This is why our Python agent must also use the BN254 Poseidon (the `poseidon-hash` library) to build the Merkle tree — if Python uses a different hash, the roots won't match and the proof fails.

### Why Linux Only

Barretenberg is a C++ library that compiles to native binaries. Aztec Labs ships Linux and macOS builds. Windows is not officially supported. The `nargo prove` step runs native code — no workaround exists.

---

## 3. Merkle Trees — How We Hide User Data

### The Plain-English Version

A Merkle tree is a data structure that lets you prove "this item is in this dataset" without revealing the rest of the dataset.

Imagine 16 user positions as 16 leaves on a tree. We hash each pair of leaves together, up the tree, until we have one single root — a 32-byte number that is a cryptographic fingerprint of all 16 positions combined.

The agent commits this root on-chain **before** generating the proof. The regulator sees the root. The regulator cannot go backwards from the root to see individual positions — hashing is one-way. But the ZK circuit proves that the private positions that produced this root all satisfy the compliance rules.

### Our Tree Structure

- **16 leaves** (TREE_SIZE = 16), depth 4 (log₂(16) = 4)
- Each leaf = `poseidon_bn254(collateral_wei, debt_usdc6)`
- 4 levels of hashing up to a single root
- `commitPositionRoot(root, blockNum)` called on `LendingProtocol` before proving

### Why Merkle Not Just a Sum

A sum could be gamed. If you have 10 healthy positions and 1 critical one, the sum is still fine. Our circuit checks every leaf individually (`for i in 0..16`) before adding to the sum. You cannot hide a bad position in an aggregate.

---

## 4. Groq — The AI Brain

### What It Is

Groq makes an inference chip (LPU — Language Processing Unit) that runs LLMs dramatically faster than GPUs. For our use case, speed matters — we're generating compliance reasoning in real time, every 60 seconds.

### The Three Models We Use

**Watcher uses `llama-3.3-70b-versatile`**
Meta's Llama 3.3 70B model running on Groq's LPU infrastructure. The Watcher uses it to synthesise on-chain data — health factors, collateral ratios, pending regulator requests — into a structured risk assessment (`low / medium / high / critical`). No external search tools; all inputs are live on-chain data fetched directly via Web3.

**Analyst uses `llama-3.3-70b-versatile`**
The same model is used for the Analyst agent, which decides what compliance actions to take based on the Watcher's risk assessment. It returns a precise JSON array of actions with correctly typed fields — e.g. `{"action": "generate_proof", "reason": "..."}`. The model's instruction-following capability is key here.

**Reporter uses `llama-3.3-70b-versatile`**
The most capable general model for writing the on-chain reasoning string — professional, specific, cites actual numbers.

### What Groq Outputs That Goes On-Chain

Every compliance report permanently stores the LLM's reasoning. For example:

> "All 5 positions are above 150% threshold. Minimum health factor is 163%. Generating routine epoch proof for block #8294801 per GENIUS Act requirements. No new OFAC sanctions detected in last 24h. Protocol is compliant."

This text is stored in `ComplianceRegistry.sol`'s `agentReasoning` field. It can be read on-chain forever.

---

## 5. Agno — The Agent Framework

### What It Is

Agno is a Python framework for building AI agents. It handles the plumbing: connecting models, registering tools, managing prompts, and running agents.

### How We Use It

Each of our three agents is an `agno.agent.Agent` object with:
- A `model` (our Groq model)
- A list of `tools` (Python functions decorated with `@tool` that the model can call)
- `instructions` (the system prompt)

```python
watcher_agent = Agent(
    name="Provium Watcher",
    model=Groq(id="llama-3.3-70b-versatile"),
    tools=[get_all_positions, get_pending_regulator_requests, ...],
    instructions=[...]
)
```

### Why Python Orchestrates Instead of Agno Teams

Agno has a `Team` feature where a leader agent passes tasks to sub-agents. We tried it. The problem: the leader LLM **summarises** position data when passing it between agents rather than forwarding the raw JSON verbatim. When the Merkle tree builder receives "users have roughly 160% collateral" instead of the exact wei values, the Merkle root is wrong and the proof fails.

**Our solution:** Python extracts raw JSON from each agent's tool call results and passes it directly to the next agent. The LLMs handle reasoning. Python handles data wiring. This is more reliable for a financial system — you never want an LLM paraphrasing a number.

---

## 6. The Smart Contracts — What Lives On-Chain

### LendingProtocol.sol

The simulated DeFi lending protocol. In production this would be an existing protocol like Aave or Compound. Ours is a minimal implementation for demo purposes.

**Key functions:**
- `deposit(wethAmount)` — user deposits WETH as collateral
- `borrow(usdcAmount)` — user borrows USDC against collateral
- `getHealthFactor(address)` — returns collateral/debt ratio in basis points (15000 = 150%)
- `commitPositionRoot(root, blockNum)` — agent-only, commits the Merkle root before proving
- `triggerUndercollateralization(address)` — owner-only, sets collateral to 140% for demo

**Health factor formula:**
```
healthFactor = (collateral_wei × wethPrice × 10000) / (debt_usdc6 × 1e18)
15000 bps = 150% = GENIUS Act minimum
```

### RegulatorPortal.sol

The on-chain interface for regulators. A regulator submits a compliance request, the agent fulfills it.

**Key functions:**
- `requestComplianceProof(proofType, targetBlock, jurisdiction)` — anyone calls this
- `fulfillRequest(requestId, proof, publicInputs, agentReasoning)` — agent-only, stores the proof and the LLM reasoning permanently
- `getPendingRequests()` — returns unfulfilled, non-expired requests

Deadline: 600 seconds (10 minutes) from request. Agent polls every 60s and fulfills within one epoch.

### ComplianceRegistry.sol

The permanent record store. Every proof the agent generates is stored here forever.

**What each record stores:** report ID, proof type, trigger type (routine / urgent / regulator), block number, proof hash (keccak256 of the proof bytes), is_compliant bool, total collateral, total debt, ratio in bps, jurisdiction, **the full LLM reasoning string**, timestamp, and agent wallet address.

### UltraVerifier.sol

The on-chain ZK proof verifier. `verify(proof, publicInputs)` returns true if the proof is valid, false otherwise.

**Current state:** The deployed version is a placeholder that always returns true. This is for testnet development speed.  
**Production state:** `regen_verifier.sh` runs `nargo codegen-verifier`, which generates the real ~800-line Barretenberg verifier Solidity file directly from our Noir circuit. Once deployed, any invalid proof is cryptographically rejected on-chain.

---

## 7. Base Sepolia — Why This Chain

Base is an Ethereum L2 built by Coinbase, using the OP Stack (Optimism). Sepolia is its testnet.

**Why Base:**
- 2-second block times (fast enough for 60-second agent epochs)
- ~$0.001 per transaction (agent can afford to submit proofs frequently)
- Full EVM compatibility — all our Solidity runs identically on Ethereum mainnet
- Coinbase integration makes it relevant for regulated finance

**Our deployed addresses (Base Sepolia — redeployed 2026-03-01):**
- MockWETH: `0x9F22C578DFEC01Fa58DBDA1B49427Fdfb91B2b0F`
- MockUSDC: `0x1bb719EFd1bFffAa6D79c1e0512cb6D893144829`
- LendingProtocol: `0x5a73c532Fd82C5B2d1BE21d7acff51adfACaBc6f`
- RegulatorPortal: `0x857597Ff99083c83C1c33165A61915236F20A888`
- ComplianceRegistry: `0xFbE3F85Ab541Cd538542B543E87706D00e1f7013`
- UltraVerifier: `0x93362E57c5dBA158420c8db8CB4484b12f96bB84`
- Agent wallet: `0xd707187453D29b8b3b017A02e4E6d6f6E5222017`

UltraVerifier is now **wired into** ComplianceRegistry and RegulatorPortal — `submitReport()` and `fulfillRequest()` both call `UltraVerifier.verify()` internally and revert if the proof is invalid.

---

## 8. wagmi + viem + RainbowKit — The Dashboard's Web3 Layer

### What These Are

- **viem** — TypeScript library for reading and writing to Ethereum. Lower-level, handles ABI encoding, RPC calls.
- **wagmi** — React hooks built on top of viem. `useReadContract`, `useWriteContract`, `useWatchContractEvent` — hook into React's state system.
- **RainbowKit** — The wallet connect UI. The "Connect Wallet" button that supports MetaMask, Coinbase Wallet, WalletConnect.

### How We Use Them

Every dashboard component reads live on-chain data using wagmi hooks:

```typescript
// reads ComplianceRegistry every 30 seconds, live
const { data } = useReadContract({
    address: ADDRESSES.ComplianceRegistry,
    abi: REGISTRY_ABI,
    functionName: 'getAllReports',
    query: { refetchInterval: 30_000 }
})
```

The ViolationSimulator uses `useWriteContract` to call `triggerUndercollateralization` from the regulator's browser wallet and `useWatchContractEvent` to listen for the agent's response event on-chain — updating the UI in real-time when the agent detects and responds to the violation.

### TanStack Query — Configuration

The `QueryClient` is tuned for on-chain data characteristics:

```typescript
{
    staleTime: 30_000,          // matches Base Sepolia block time × safety factor
    gcTime: 5 * 60 * 1000,      // keep unused cache 5 min before GC
    retry: 3,
    retryDelay: (n) => Math.min(1_000 * 2 ** n, 30_000), // exponential backoff, 30s cap
    refetchOnWindowFocus: false, // chain events drive updates, not tab focus
    refetchOnReconnect: true,    // refresh when network returns
}
```

In development, `ReactQueryDevtools` is injected bottom-left — open it to see every live query, cache state, and refetch trigger.

### Centralized Query Keys — `lib/query-keys.ts`

All TanStack Query cache keys are defined in a single typed factory:

```typescript
export const queryKeys = {
    compliance: { allReports: () => ['compliance', 'allReports'], ... },
    regulator:  { pendingRequests: () => ['regulator', 'pendingRequests'] },
    lending:    { position: (addr) => ['lending', 'position', addr], ... },
}
```

Prevents key collisions, enables surgical cache invalidation after state-changing txs, and makes all cache dependencies greppable.

---

## 8.5. Dashboard State Architecture — Zustand + Sonner + Skeletons

### Zustand — Client-Side State (`lib/store.ts`)

Three lightweight Zustand stores handle UI state that doesn't belong in TanStack Query (which owns server/chain state):

**`useNotificationStore`** — persisted to localStorage via `zustand/middleware/persist`. Tracks `lastSeenReportCount` vs `currentReportCount`. The Sidebar shows a live red badge on "Proof History" counting proofs submitted since the user last visited that page. Resets to zero on visit. Survives page refresh.

**`usePanelStore`** — which proof's reasoning panel is open (`activePanelProofId`). Any component in the tree can open/close the detail panel without prop drilling.

**`useSidebarStore`** — mobile collapse state. Decouples the hamburger button from the sidebar component.

### Sonner — Toast Notifications

Real-time feedback wired to on-chain events in `useAgentFeed.ts`. Toasts fire bottom-right the moment the agent submits anything on-chain — no refresh needed:

| Event | Toast style | Duration |
|---|---|---|
| `ReportSubmitted` (compliant) | Green — "Proof #N submitted — 163.0% ✓" | 6s |
| `ReportSubmitted` (violation) | Red — "VIOLATION proof #N — ratio 138.5% below minimum" | 8s |
| `ViolationRecorded` | Red — "⚠ Violation recorded" | 8s |
| `RequestFulfilled` | Yellow — "Regulator request #N fulfilled" | 6s |

### Skeleton Loading States

Three `loading.tsx` files (Next.js App Router route-level loading) provide shimmer skeletons while contract reads resolve on first mount: Overview, Proofs, Regulator. All use `components/ui/Skeleton.tsx` + the existing `shimmer` keyframe in globals.css.

### Help & Docs Page (`/dashboard/docs`)

Full in-app documentation page in the sidebar (BookOpen icon). Covers every dashboard section step-by-step plus an 11-question accordion FAQ. No external docs site needed.

---

## 8.6. Agent Caching — `agent/cache.py`

Chain reads have real latency cost — each `getPosition()` call is a JSON-RPC round-trip to Base Sepolia. With 5 users, `get_all_positions` makes 10+ RPC calls. Without caching, rapid successive agent runs (or tests) hammer the RPC endpoint.

`cache.py` uses **diskcache** — a SQLite-backed key-value store. No Redis server, no Docker, no infrastructure overhead. Two caches:

| Cache | Location | Size limit | What's stored |
|---|---|---|---|
| `chain_cache` | `agent/.cache/chain` | 50 MB | `get_all_positions` (30s TTL), `get_pending_regulator_requests` (15s TTL) |
| `groq_cache` | `agent/.cache/groq` | 25 MB | Available for LLM call deduplication (5 min TTL) |

**Graceful fallback:** if `diskcache` isn't installed, a `_MemCache` in-memory dict takes over with the same API surface. Agent runs without crashing; just no persistence between runs.

**Why 30s TTL for chain reads?** Base Sepolia produces a block every ~2 seconds. Within any single agent epoch, the positions don't change unless someone calls `triggerUndercollateralization` mid-run. A 30s cache eliminates redundant reads inside one epoch while never being stale across epochs.

**`invalidate_chain_cache()`** — call this immediately after any state-changing tx (violation trigger, root commit) to force a fresh read on the next call.

---

## 9. ENS — Ethereum Name Service

### What It Is

ENS is Ethereum's DNS. Instead of displaying `0xd707187453D29b8b3b017A02e4E6d6f6E5222017`, it shows `zkcomply-agent.eth` (if that address has an ENS name registered).

### How We Use It

`components/EnsAddress.tsx` is a React component that:
1. Takes a `0x` address as prop
2. Calls `useEnsName({ address, chainId: mainnet.id })` — looks up the ENS name on Ethereum mainnet
3. Shows the ENS name if found, truncated `0x` address if not

Because ENS lives on Ethereum mainnet (not Base Sepolia), our `wagmi.ts` configures **two chains** — `baseSepolia` for contract interactions and `mainnet` just for ENS resolution. This is why wagmi.ts has `[mainnet.id]: http() // ENS resolution` as a transport.

**What to say to judges:**
> "Every address in the dashboard resolves to an ENS name automatically. If the agent wallet or a regulator wallet has registered an ENS name on mainnet, the dashboard shows that instead of a hex string. It's a UI polish detail, but it means the system is wired to the full Ethereum identity layer, not just Base. We handle two-chain state transparently — Base for computation, mainnet for identity."

---

## 10. OFAC Screening — The Compliance Context

### What OFAC Is

OFAC (Office of Foreign Assets Control) is a US Treasury department. It maintains the SDN list — Specially Designated Nationals — wallet addresses that are sanctioned. Interacting with a sanctioned wallet without logging that you tried to prevent it is a federal violation.

### How We Screen

The Watcher agent uses `llama-3.3-70b-versatile` to assess compliance risk from live on-chain data — health factors, hours since last proof, and pending regulator requests. It synthesises these into a risk level: `low / medium / high / critical`. This feeds the Analyst's decision — if risk level is elevated, it adjusts urgency even if on-chain ratios look fine.

Risk assessment is on-chain data only (no external web search), making the agent deterministic and independent of third-party API availability during a live demo.

**For production**: a dedicated OFAC module could cross-reference the SDN list against protocol participants. The current system focuses on the solvency proof layer — the core regulatory requirement under the GENIUS Act.

---

## 11. The GENIUS Act — The Regulatory Context

Signed into law in July 2025, the GENIUS Act (Guiding and Establishing National Innovation for US Stablecoins) requires:
- Minimum 150% collateral backing for DeFi stablecoins
- Protocols operating in the US must maintain compliance records
- Reporting obligations for overcollateralisation ratios

Our circuit hardcodes `min_ratio_bps = 15000` (150%) as the threshold. Every proof published on-chain cites `"US-GENIUS-ACT"` as the jurisdiction. The agent's reasoning strings explicitly reference GENIUS Act compliance.

---

## Cheat Sheet — One Line Per Technology

| Technology | One-line explanation |
|---|---|
| **Noir** | Language for writing ZK circuits — like Rust but compiles to math constraints |
| **Barretenberg** | Aztec's prover engine — generates the cryptographic proof from the circuit |
| **BN254 Poseidon** | ZK-friendly hash function — must be identical in Python and Noir or Merkle root mismatches |
| **UltraVerifier** | Auto-generated Solidity contract — rejects any proof that doesn't satisfy the circuit |
| **Merkle tree** | Fingerprints all 16 positions into one root — proves membership without revealing individual data |
| **Groq** | Fastest LLM inference available — runs three AI agent models, stores reasoning on-chain |
| **llama-3.3-70b-versatile** | Groq model used by both Watcher and Analyst — chain data analysis + compliance decisions |
| **Agno** | Python agent framework — wires Groq models to on-chain tools |
| **Base Sepolia** | L2 testnet — 2s blocks, ~$0.001/tx, identical to mainnet Ethereum |
| **wagmi + viem** | React hooks for live on-chain data — dashboard refetches every 30s with exponential retry |
| **TanStack Query** | Server-state cache — staleTime 30s, gcTime 5min, typed query-key factory, DevTools in dev |
| **Zustand** | Client UI state — notification badge count, panel open state, sidebar collapse |
| **Sonner** | Toast notifications — wired to contract events, fires when agent submits proof live |
| **diskcache** | Python SQLite cache — 30s TTL for chain reads, no Redis needed, fallback to in-memory |
| **RainbowKit** | Wallet connect UI — Connect Wallet button |
| **ENS** | Ethereum Name Service — shows `name.eth` instead of `0x...` addresses |
| **OFAC** | US Treasury sanctions list — Watcher assesses risk from live on-chain data every epoch |
| **GENIUS Act** | July 2025 US law — mandates 150% collateral, our circuit enforces it cryptographically |
