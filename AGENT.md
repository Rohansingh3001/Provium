# Agent Module — `agent/`

The Python brain of Provium. Three Groq AI agents run in a deterministic orchestration pipeline every 60 seconds.

---

## Directory Layout

```
agent/
├── main.py             # CLI entry point — arg parsing, pre-flight checks, epoch loop
├── orchestrator.py     # Deterministic Python pipeline — wires agents together
├── cache.py            # diskcache (SQLite) wrapper — chain read TTLs
├── team.py             # Unused legacy Agno team approach (kept for reference)
│
├── agents/
│   ├── watcher.py      # Groq compound-beta — OFAC web search + chain monitoring
│   ├── analyst.py      # Groq llama3-70b-tool-use — decides urgency + writes on-chain reasoning
│   └── reporter.py     # Groq llama3-70b-versatile — executes the proof pipeline
│
├── tools/
│   ├── chain_tools.py      # Web3 reads from LendingProtocol + ComplianceRegistry
│   ├── proof_tools.py      # Merkle tree build, Prover.toml write, nargo prove call
│   ├── submit_tools.py     # On-chain writes: ComplianceRegistry + RegulatorPortal
│   └── bitgo_tools.py      # BitGo wallet integration (bounty integration)
│
├── logs/               # Daily rotating log files (agent_YYYYMMDD.log)
├── .cache/             # diskcache SQLite files (chain/ and groq/)
├── .env                # GROQ_API_KEY, AGENT_PRIVATE_KEY, BASE_SEPOLIA_RPC, etc.
└── requirements.txt
```

---

## Entry Point — `main.py`

```
python main.py             # live mode, runs every 60 seconds
python main.py --dry-run   # reads chain, skips all on-chain writes
python main.py --once      # single epoch then exit
python main.py --interval 300   # every 5 minutes
```

**Pre-flight checks** (run automatically unless `--skip-checks`):
- All required env vars present
- `deployments/base-sepolia.json` exists with all 4 contract addresses
- `nargo` binary available on PATH
- BN254 Poseidon hash library (`poseidon-hash`) installed and field-valid
- Base Sepolia RPC reachable

---

## Orchestrator — `orchestrator.py`

The most important file in the agent. Implements the three-phase pipeline with **Python data wiring** (not LLM forwarding).

### Why Python wires the data, not an LLM

An LLM team leader *summarises* JSON instead of forwarding it verbatim. When the Reporter sees "5 positions with average 171% ratio" instead of the raw collateral/debt numbers, the Merkle tree it builds is wrong and the proof fails. The orchestrator extracts raw JSON from each agent response via regex, then passes it directly to the next phase.

### Phase 1 — Watcher

```python
def run_watcher_phase() -> dict:
```

1. Calls `get_all_positions()`, `get_pending_regulator_requests()`, `get_latest_compliance_report()` directly via Web3 — **guaranteed accurate data regardless of LLM output**
2. Runs Watcher LLM with the chain data as context → gets `risk_level`, `ofac_news`, `summary`
3. Watcher LLM failure is non-fatal — falls back to `risk_level: "low"`

Returns a combined dict with both the raw chain data and the LLM assessment.

### Phase 2 — Analyst

```python
def run_analyst_phase(watcher: dict) -> list[dict]:
```

Runs Analyst LLM with structured chain metrics. Expects a JSON array of **action** dicts:

```json
[{
  "urgency": "routine | urgent | critical",
  "agent_reasoning": "Text stored permanently on-chain...",
  "request_id": 0,
  "trigger": 0
}]
```

**Deterministic fallback** if LLM parsing fails:
- `min_health_factor < 15000 bps` → `urgency=critical` (VIOLATION)
- `min_health_factor < 16000 bps` → `urgency=urgent`
- `hours_since_last_proof > 1` → generate routine proof
- Each pending regulator request → add a separate action

### Phase 3 — Reporter

```python
def run_reporter_phase(watcher: dict, action: dict) -> dict:
```

Calls tools directly in strict order — **no LLM routing**:

| Step | Tool | Effect |
|------|------|--------|
| 1 | `build_merkle_tree_and_inputs()` | Builds Poseidon2 Merkle tree, writes `Prover.toml` |
| 2 | `commit_merkle_root()` | Commits root on-chain (non-fatal if fails) |
| 3 | `generate_zk_proof()` | Runs `nargo prove` via Barretenberg (30–120s) |
| 4 | `submit_proof_to_registry()` | Writes proof + AI reasoning to `ComplianceRegistry` |
| 5 | `fulfill_regulator_request()` | Only if `request_id > 0` |

Violations are **always recorded** — `is_compliant=false` is not suppressed.

---

## The Three Agents

### Watcher — `agents/watcher.py`

- **Model:** `compound-beta` — Groq's compound model that autonomously orchestrates web searches
- **Tools:** `DuckDuckGoTools`, `get_all_positions`, `get_pending_regulator_requests`, `get_latest_compliance_report`, `get_current_position_root`
- **Does:** Real-time OFAC SDN list monitoring via DuckDuckGo. Returns structured risk assessment.
- **Runs as:** Full Agno agent (LLM + tools). Output is parsed for `risk_level` and `ofac_news`.

### Analyst — `agents/analyst.py`

- **Model:** `llama3-groq-70b-8192-tool-use-preview` — Groq's fine-tuned tool-use model, optimised for structured JSON output
- **Tools:** None — receives structured data as prompt context
- **Does:** Reads chain metrics, applies decision rules, writes `agent_reasoning` strings that go permanently on-chain. These are written to be readable by regulators and judges.
- **Runs as:** Pure reasoning agent (no tools, JSON output only)

### Reporter — `agents/reporter.py`

- **Model:** `llama-3.3-70b-versatile`
- **Tools:** `build_merkle_tree_and_inputs`, `commit_merkle_root`, `generate_zk_proof`, `submit_proof_to_registry`, `fulfill_regulator_request`
- **Does:** Orchestrated by the Python pipeline in practice — the Reporter agent definition is used for initialisation but the actual tool calls happen directly via `_run_tool_directly()` in the orchestrator for reliability.

---

## Tools — `tools/`

### `chain_tools.py`

All reads from Base Sepolia via Web3. Key functions:

| Function | Contract | Cache TTL |
|----------|----------|-----------|
| `get_all_positions()` | `LendingProtocol` | 30s |
| `get_pending_regulator_requests()` | `RegulatorPortal` | 15s |
| `get_latest_compliance_report()` | `ComplianceRegistry` | 30s |
| `get_current_position_root()` | `LendingProtocol` | 30s |

Returns: user count, per-position collateral/debt/health-factor-bps, aggregate totals, `min_health_factor_bps`, `aggregate_ratio_pct`, time since last proof.

### `proof_tools.py`

The ZK proof pipeline:

1. **`build_merkle_tree_and_inputs(positions_json)`**  
   - Pads positions to 16 slots (circuit fixed size)  
   - Computes Poseidon2 leaf hashes `p2hash(collateral, debt)` for each position  
   - Builds a 4-level binary Merkle tree  
   - Writes `circuits/collateral_proof/Prover.toml` with all private and public inputs  
   - Returns: `root`, `prover_toml_content`, `total_collateral`, `total_debt`, `block_number`, `ratio_bps`

2. **`commit_merkle_root(root, block_number)`**  
   - Calls `LendingProtocol.commitPositionRoot()` on-chain  
   - Root becomes public input the verifier checks

3. **`generate_zk_proof(prover_toml_content)`**  
   - Writes `Prover.toml` to disk  
   - Shells out to `nargo prove` (30–120 seconds)  
   - Reads `target/proof` output  
   - Returns: `proof_hex`, `is_compliant` bool, `generation_time_seconds`

### `submit_tools.py`

On-chain write calls:

- **`submit_proof_to_registry(...)`** — calls `ComplianceRegistry.submitReport()` with proof, public inputs, `agent_reasoning`, compliance status
- **`fulfill_regulator_request(...)`** — calls `RegulatorPortal.fulfillRequest()` with the same proof

### `cache.py`

`diskcache` wrapper with SQLite backend at `agent/.cache/`. Two caches:

- `chain_cache` — 50 MB limit, used for Web3 reads
- `groq_cache` — 25 MB limit, used for LLM calls

The `@cached(cache, ttl=30, key="get_all_positions")` decorator skips caching if the function returns an error dict. Falls back to an in-memory dict if `diskcache` is not installed.

---

## Environment Variables — `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✓ | Groq LLM API key — free at console.groq.com |
| `AGENT_PRIVATE_KEY` | ✓ | Agent wallet private key (needs Base Sepolia ETH) |
| `BASE_SEPOLIA_RPC` | ✓ | RPC URL — default: `https://sepolia.base.org` |
| `DEPLOYMENTS_PATH` | ✓ | Path to `base-sepolia.json` |
| `ZKCOMPLY_DRY_RUN` | — | Set to `"1"` to skip all on-chain writes |
| `BITGO_*` | — | BitGo wallet integration (optional bounty) |
