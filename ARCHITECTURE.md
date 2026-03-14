# Provium — Architecture & Bounty Integration Deep Dive

## System Overview

Provium is an autonomous compliance infrastructure for DeFi protocols, built to satisfy the reserve-proof requirements of the **US GENIUS Act** (Guiding and Establishing National Innovation for U.S. Stablecoins). The system operates as three coordinated layers:

1. **Smart Contracts** — On-chain compliance registry, regulator portal, and ZK verifier on Base Sepolia
2. **Autonomous Agent** — Python-based pipeline that monitors, proves, and submits compliance reports
3. **Dashboard** — Next.js regulator-facing interface for real-time monitoring

---

## Why This Architecture?

### The Problem

DeFi protocols hold user funds but have no standardized way to prove solvency to regulators. Traditional audits are:
- **Slow** — quarterly or annual, always retrospective
- **Opaque** — auditors see everything, violating privacy of individual positions
- **Centralized** — trust the auditor, not the math

### The Solution

Provium provides **continuous, privacy-preserving, on-chain compliance**:

| Traditional Audit | Provium |
|---|---|
| Quarterly reports | Every 60 seconds |
| Full data disclosure | ZK proofs — no individual positions revealed |
| Trust the auditor | Trust the math (verifiable on-chain) |
| PDF reports | On-chain records + decentralized dossiers |
| Manual process | Fully autonomous AI agent |

---

## ZK Circuit Design

### What We Prove

The circuit (`circuits/collateral_proof/src/main.nr`) generates a proof that:

```
For all 16 positions in the protocol:
  1. EACH position individually meets the minimum collateral ratio (150%)
     → Prevents hiding one bad position in a healthy aggregate

  2. EACH position's (collateral, debt) pair hashes to a leaf in the
     committed Poseidon2 Merkle tree
     → Proves private data matches what's committed on-chain

  3. Sum of all private collaterals = claimed public total_collateral
     Sum of all private debts      = claimed public total_debt
     → Prevents fabricating aggregates

  4. Aggregate ratio ≥ threshold (redundant safety check)
```

### Why Poseidon2?

- ZK-friendly hash function (low constraint count in BN254 circuits)
- Native support in Noir stdlib (`std::hash::poseidon2_permutation`)
- Identical implementation in Python (`poseidon-hash` library) ensures Merkle tree consistency between agent and circuit

### Proof Pipeline

```
Agent reads positions from LendingProtocol
                    │
                    ▼
     Build Poseidon2 Merkle tree (Python)
     ┌─────────────────────────────┐
     │  leaf[i] = P2(coll_i, debt_i) │
     │  tree = binary Merkle tree   │
     │  root = top hash             │
     └─────────────┬───────────────┘
                    │
                    ▼
     Commit root on-chain
     LendingProtocol.commitPositionRoot(root, blockNum)
                    │
                    ▼
     Write Prover.toml (private + public inputs)
                    │
                    ▼
     nargo execute → witness generation
                    │
                    ▼
     bb prove --verify -t evm → proof artifact
                    │
                    ▼
     ComplianceRegistry.submitReport(proof, publicInputs)
                    │
                    ▼
     UltraVerifier.verify(proof, publicInputs) → true/false
```

---

## Agent Architecture

### Why Not Let the LLM Orchestrate?

Early prototypes used Agno's team leader pattern — one LLM agent delegates to others. This failed because:

> **LLMs summarize data.** When the team leader passes position data from Watcher to Reporter, it summarizes the JSON instead of forwarding it verbatim. The Merkle tree then gets built from summarized numbers, producing a different root, and the ZK proof fails.

**Solution:** Python orchestrates the data pipeline deterministically. LLMs handle reasoning only.

```
orchestrator.py
├── Phase 1: WATCHER
│   ├── Python: calls get_all_positions(), get_pending_regulator_requests()
│   ├── LLM: "Given these positions, assess risk level"
│   └── Output: watcher_report (JSON)
│
├── Phase 2: ANALYST
│   ├── Python: passes watcher_report to analyst
│   ├── LLM: "Given this report, what actions should we take?"
│   └── Output: actions[] array
│
└── Phase 3: REPORTER (for each action)
    ├── Python: build_merkle_tree_and_inputs()  ← deterministic
    ├── Python: commit_merkle_root()            ← on-chain tx
    ├── Python: generate_zk_proof()             ← nargo + bb
    ├── Python: submit_proof_to_registry()      ← on-chain tx
    ├── Python: fulfill_regulator_request()     ← if applicable
    └── Python: upload_compliance_dossier()     ← Fileverse/local
```

### Security Measures

| Threat | Mitigation |
|--------|-----------|
| **Prompt injection** | `_sanitize_field()` strips control chars from all on-chain strings before they enter LLM prompts. `_sanitize_jurisdiction()` enforces an alphanumeric allowlist. |
| **Hallucinated actions** | Analyst outputs `request_id` fields. Before fulfilling any request, orchestrator validates it exists in `known_request_ids` from the actual on-chain pending requests. Unknown IDs are silently dropped. |
| **Data summarization** | Python passes raw JSON between phases — LLMs never touch the position data that feeds into the Merkle tree. |

---

## Bounty Integration: BitGo

### Integration Point

```
submit_tools.py: submit_proof_to_registry()
    ├── Try: BitGo multi-sig (send_via_bitgo)
    │   ├── Build EVM calldata (ABI-encode submitReport args)
    │   ├── POST to BitGo REST API v2 /sendcoins
    │   ├── BitGo handles: multi-sig signing, policy check, broadcast
    │   └── Return: {txid, status, multisig: true}
    │
    └── Fallback: eth_account (raw private key signing)
        └── Standard web3.py sendTransaction
```

### Why BitGo for Compliance?

1. **Multi-sig (2-of-3):** A rogue agent cannot unilaterally submit false compliance reports. BitGo's co-signing key provides an additional verification layer.

2. **Policy enforcement:** BitGo policies can restrict which contracts the agent wallet can interact with (whitelist ComplianceRegistry only), set velocity limits, and require additional approvals for unusual behavior.

3. **Audit trail:** Every transaction is logged by BitGo with metadata (`comment` field includes "Provium ZK compliance proof submission"), creating an independent audit trail beyond on-chain data.

4. **Enterprise key management:** The agent's signing key lives in BitGo's HSM, not in a `.env` file on the agent machine. Even if the agent server is compromised, the attacker cannot exfiltrate the private key.

### Configuration

```
BITGO_ACCESS_TOKEN=<your_token>
BITGO_WALLET_ID=<your_wallet_id>
BITGO_WALLET_PASSPHRASE=<your_passphrase>
BITGO_ENV=test              # test or prod
BITGO_COIN=tbaseeth         # Base Sepolia testnet
```

---

## Bounty Integration: Fileverse

### Integration Point

```
orchestrator.py: _run_epoch() → after proof submission
    └── upload_compliance_dossier()
        ├── build_compliance_dossier()     → structured JSON
        ├── Try: _upload_to_fileverse()    → IPFS/Filecoin via Fileverse API
        └── Fallback: _save_to_local()     → agent/dossiers/*.json
```

### Dossier Schema

Every compliance dossier follows `provium-compliance-dossier-v1`:

```json
{
  "schema": "provium-compliance-dossier-v1",
  "generated_at": "2025-01-15T12:00:00Z",
  "epoch": 42,
  "chain": {
    "network": "Base Sepolia",
    "chain_id": 84532,
    "tx_hash": "0x...",
    "block_number": 12345678,
    "basescan_url": "https://sepolia.basescan.org/tx/0x...",
    "verified_on_chain": true
  },
  "proof": {
    "type": "collateral_ratio",
    "circuit": "collateral_proof (Noir/BN254/UltraHonk)",
    "is_compliant": true,
    "generation_time_seconds": 33.7
  },
  "agent": {
    "urgency": "routine",
    "trigger": 0,
    "request_id": 0,
    "reasoning": "Scheduled compliance check. All positions healthy."
  },
  "protocol_snapshot": {
    "user_count": 5,
    "aggregate_ratio_pct": 180.5,
    "risk_level": "low"
  },
  "jurisdiction": "US-GENIUS-ACT",
  "content_hash": "sha256:..."
}
```

### Why Fileverse?

On-chain storage is optimized for proof hashes and short strings. Regulators need **rich** documents: full proof metadata, agent reasoning, protocol snapshots, timestamps, links to Basescan. Fileverse provides:

- **Decentralized storage** — IPFS/Filecoin backed, no single point of failure
- **Permanent URLs** — each dossier gets a content-addressable URL for regulator handoff
- **Integrity verification** — SHA-256 content hash computed before upload, verifiable independently
- **Privacy-ready** — Fileverse supports encryption workflows for sensitive compliance data

---

## Bounty Integration: ENSIP-25

### Integration Point

```
ensip25.py: get_ensip25_text_key()
    ├── encode_erc7930_address(84532, ComplianceRegistry)
    │   └── 0x0001000003014a3414<registry_address>
    └── "agent-registration[<erc7930>][<agentId>]"
```

### How It Works

ENSIP-25 creates a verifiable link between the ENS name `provium-agent.eth` and the on-chain ComplianceRegistry entry:

```
1. Agent sets text record on provium-agent.eth:
   Key:   agent-registration[0x0001000003014a3414fbe3...][1]
   Value: 1

2. Any verifier resolves the text record:
   → Non-empty value = agent is verified

3. The key encodes:
   → 0x0001     = EIP-155 namespace (EVM chain)
   → 000003     = chain ID is 3 bytes
   → 014a34     = chain ID 84532 (Base Sepolia)
   → 14         = address is 20 bytes
   → fbe3...    = ComplianceRegistry address
   → [1]        = agent ID in registry
```

This gives the autonomous compliance agent a **human-readable, cryptographically-backed identity** — anyone can verify that `provium-agent.eth` is the legitimate operator of the on-chain compliance infrastructure.

---

## Dashboard Architecture

```
Next.js App Router
├── / (Landing)
│   ├── Hero, HowItWorks, AgentShowcase
│   ├── RegulatorPreview, FTXSection (cautionary tale)
│   └── FinalCTA
│
└── /dashboard
    ├── /overview — AgentStatusCard, ComplianceCard, ProtocolStats, AgentBrainFeed
    ├── /proofs — ProofTable (with Fileverse dossier links)
    ├── /regulator — RegulatorForm + RequestList
    ├── /simulate — ViolationSimulator (trigger undercollateralization)
    ├── /tracks — Bounty integration info
    └── /docs — Documentation

Tech: wagmi + viem + RainbowKit + Tailwind CSS
Chain reads: useProofHistory, useComplianceStatus, useRegulatorRequests (React hooks)
```

---

## Testing

### pytest Test Suite (`agent/test_provium.py`)

40 tests covering:
- **ENSIP-25**: ERC-7930 encoding (mainnet, Base Sepolia), text key construction, verification logic
- **Fileverse**: Dossier builder (schema, hash integrity, all fields), local save, status reporting
- **BitGo**: Client config, disabled-state behavior, calldata builder
- **Security**: Sanitization functions (control char stripping, truncation, jurisdiction injection defense)
- **Imports**: All 5 tool modules import cleanly

```bash
cd agent && source venv/bin/activate
python -m pytest test_provium.py -v
# Expected: 40 passed
```

### Integration Test (`agent/test_bounty_integrations.py`)

Standalone script that exercises all three bounty integrations end-to-end:

```bash
cd agent && source venv/bin/activate
python test_bounty_integrations.py
# Tests: Fileverse dossier builder + local save, BitGo status, ENSIP-25 imports
```

---

## Deployment

All contracts are deployed and verified on Base Sepolia. The agent wallet (`0xd707...`) is authorized in ComplianceRegistry and RegulatorPortal. The UltraVerifier contract verifies Noir proofs on-chain.

See `contracts/deployments/base-sepolia.json` for all addresses.
