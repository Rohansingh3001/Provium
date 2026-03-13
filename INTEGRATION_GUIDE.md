# Provium — Integration Guide for DeFi Protocols

> How your protocol goes from "compliance risk" to "cryptographically compliant" in four steps.

---

## Who This Document Is For

This guide is written for the **engineering and compliance teams** at a DeFi lending protocol that wants to:

- Prove GENIUS Act (≥ 150% collateral) compliance without exposing user data
- Respond to OFAC-related regulator requests with cryptographic proof
- Maintain a permanent, auditable compliance record on-chain
- Avoid six-figure fines that come from being unable to prove compliance

---

## What Provium Does (and Does Not Do)

| Provium handles | You keep handling |
|----------------|-------------------|
| Generating ZK proofs of collateral ratios | Your existing lending logic |
| Monitoring OFAC updates via live web search | Your user onboarding / KYC (if any) |
| Fulfilling regulator requests on-chain | Your liquidation engine |
| Storing AI reasoning permanently on chain | Your token economics |
| Detecting and recording violations | Your governance |

Provium is a **compliance layer** that sits alongside your protocol. It doesn't replace anything you already run — it adds a cryptographic audit trail on top of it.

---

## The Integration in Four Steps

```
Step 1 ── Add two functions to your lending contract
Step 2 ── Deploy the three Provium contracts
Step 3 ── Configure and run the agent
Step 4 ── Point regulators at the Regulator Portal
```

---

## Step 1 — Modify Your Lending Contract

Your existing lending contract needs to expose **two things**:

### 1a — A read function for all active positions

The agent needs to be able to read all user positions every 60 seconds. Add this (or verify it already exists in equivalent form):

```solidity
function getAllActivePositions()
    external
    view
    returns (
        address[] memory users,
        uint256[] memory collaterals,
        uint256[] memory debts
    )
{
    uint256 n = userList.length;
    users       = new address[](n);
    collaterals = new uint256[](n);
    debts       = new uint256[](n);
    for (uint256 i = 0; i < n; i++) {
        address u  = userList[i];
        users[i]   = u;
        collaterals[i] = positions[u].collateral;
        debts[i]   = positions[u].debt;
    }
}
```

> **Note on units:** The Provium agent expects collateral in wei (18 decimals) and debt in USDC-6 (6 decimals). If your protocol uses different units, update `proof_tools.py` → `_to_field_wei()` to match.

### 1b — A Merkle root commit function

The agent commits a Poseidon2 Merkle root before each proof. This root is the public input that ties the proof to your actual chain state.

```solidity
bytes32 public currentPositionRoot;
uint256 public positionRootBlock;
address public agentAddress;

modifier onlyAgent() {
    require(msg.sender == agentAddress, "Only agent");
    _;
}

function commitPositionRoot(bytes32 root, uint256 blockNum) external onlyAgent {
    currentPositionRoot = root;
    positionRootBlock   = blockNum;
    emit PositionRootCommitted(root, blockNum);
}

function setAgentAddress(address agent) external onlyOwner {
    agentAddress = agent;
}
```

**That's all you change.** No modifications to your deposit, borrow, repay, or liquidation logic.

---

## Step 2 — Deploy the Three Provium Contracts

Clone the Provium repo and deploy to your target network:

```bash
git clone https://github.com/your-org/provium
cd contracts
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY, BASE_SEPOLIA_RPC (or mainnet RPC)
```

Edit `scripts/deploy.ts` to point at **your** existing lending contract instead of deploying `LendingProtocol.sol`:

```diff
-const lending = await LendingProtocol.deploy(weth.address, usdc.address);
+const lending = { address: "0xYOUR_EXISTING_LENDING_PROTOCOL_ADDRESS" };
```

Then deploy:

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
# (or --network mainnet, --network arbitrum, etc.)
```

This deploys three contracts and writes `deployments/<network>.json`:

| Contract | Purpose | Who interacts |
|----------|---------|--------------|
| `UltraVerifier` | On-chain BN254 PlonK verifier | Called automatically by ComplianceRegistry |
| `ComplianceRegistry` | Permanent proof + AI reasoning ledger | Agent writes, anyone reads |
| `RegulatorPortal` | Regulator request queue | Regulators write, agent fulfills |

### Post-Deploy Configuration

```bash
# Grant the agent wallet permission to submit proofs
npx hardhat run scripts/setup_post_deploy.ts --network baseSepolia
```

This calls:
- `ComplianceRegistry.setAgentAddress(agentWallet)`
- `RegulatorPortal.setAgentAddress(agentWallet)`
- `YourLendingContract.setAgentAddress(agentWallet)` ← your contract from Step 1

---

## Step 3 — Configure and Run the Agent

```bash
cd agent
cp .env.example .env
```

Fill in `.env`:

```env
# Required
GROQ_API_KEY=gsk_...           # Free at console.groq.com
AGENT_PRIVATE_KEY=0x...        # A dedicated hot wallet — fund with 0.1 ETH for gas
BASE_SEPOLIA_RPC=https://...   # Your RPC endpoint (Alchemy, Infura, or public)
DEPLOYMENTS_PATH=../contracts/deployments/base-sepolia.json

# Optional — point the agent at your lending contract
LENDING_PROTOCOL_ADDRESS=0xYOUR_EXISTING_CONTRACT  # if different from deployments JSON
```

### Verify everything works before going live:

```bash
python main.py --dry-run --once
```

This runs one complete epoch — reads your chain state, builds the Merkle tree, runs the Analyst's decision — but **does not write anything on-chain**. You'll see exactly what the agent would do.

When the dry run looks right:

```bash
python main.py
```

The agent runs every 60 seconds. It will:
- Read all positions from your lending contract
- Search for OFAC updates via DuckDuckGo
- Generate a ZK proof if needed
- Submit the proof + AI reasoning to `ComplianceRegistry`
- Fulfill any pending regulator requests

### Running in Production

For production use, run the agent as a managed process (systemd, Docker, or a cloud VM):

```bash
# Example systemd service (Linux)
[Unit]
Description=Provium Compliance Agent
After=network.target

[Service]
WorkingDirectory=/opt/provium/agent
ExecStart=/opt/provium/agent/venv/bin/python main.py --interval 60
Restart=always
RestartSec=10
EnvironmentFile=/opt/provium/agent/.env

[Install]
WantedBy=multi-user.target
```

The agent logs daily to `logs/agent_YYYYMMDD.log` and stdout. Set up log rotation and alerting on `ERROR` lines.

---

## Step 4 — Point Regulators at the Regulator Portal

Regulators, auditors, and compliance officers have **two ways** to interact with your compliance record:

### Option A — On-chain (permissionless)

Any address can submit a compliance request directly to `RegulatorPortal`:

```solidity
RegulatorPortal.requestComplianceProof(
    proofType,    // 0 = collateral ratio check
    targetBlock,  // which block to prove (use current block)
    jurisdiction  // "US-GENIUS-ACT", "EU-MICA", "FATF"
)
```

The agent detects the request within one epoch (≤ 60 seconds) and fulfills it automatically. The regulator can then read the result:

```solidity
RegulatorPortal.getRequest(requestId)
// Returns: fulfilled=true, proofHash, agentReasoning
```

### Option B — Provium Dashboard

Give your regulators the dashboard URL. They submit a request through the UI, watch it get fulfilled in real time, and download the proof hash + AI reasoning.

### Option C — Direct Basescan

Every `ComplianceReport` is publicly readable on Basescan forever. No API, no trust — just the blockchain:

```
https://sepolia.basescan.org/address/0xYOUR_COMPLIANCE_REGISTRY
→ Read Contract → getAllReports()
```

A regulator with basic blockchain literacy can verify your compliance history without involving Provium at all.

---

## What Regulators Actually Receive

When a request is fulfilled, the regulator gets:

```json
{
  "requestId": 14,
  "proofHash": "0x9f3a...c281",
  "isCompliant": true,
  "totalCollateral": "342000000000000000000",
  "totalDebt": "200000000000",
  "ratioBps": 17100,
  "jurisdiction": "US-GENIUS-ACT",
  "agentReasoning": "Routine collateral ratio proof for US-GENIUS-ACT jurisdiction. All 5 positions verified above 150% minimum threshold. Lowest position at 163% collateral ratio. Aggregate: 342 ETH collateral, 200,000 USDC debt. Protocol ratio: 171%. No violations detected at block #18,294,847.",
  "blockNumber": 18294847,
  "timestamp": 1741347472
}
```

**What they can verify:**
- `proofHash` → the raw ZK proof bytes can be re-verified against `UltraVerifier`
- `ratioBps` → 17100 = 171%, above the 15000 (150%) GENIUS Act minimum
- `agentReasoning` → plain-English AI explanation, tied to a specific block, immutable
- `blockNumber` → exactly which block's state was proven

**What they cannot see:**
- Individual user wallet addresses
- Individual position sizes
- Who borrowed what

---

## Ongoing Operations

### What runs continuously

```
Your protocol  ─────  (unchanged, no new operational burden)

Provium agent  ─────  1 Linux server or VM (~$5/mo on a VPS)
                       │
                       ├── Reads your lending contract every 60s
                       ├── Searches OFAC updates via DuckDuckGo
                       ├── Generates ZK proofs (30–120s each)
                       └── Submits to ComplianceRegistry on-chain
```

### Gas costs

Each epoch that triggers a proof generation has three on-chain transactions:

| Transaction | Approximate Gas |
|------------|----------------|
| `commitPositionRoot` | ~50,000 gas |
| `ComplianceRegistry.submitReport` | ~200,000–300,000 gas |
| `RegulatorPortal.fulfillRequest` (if triggered) | ~150,000 gas |

At Base mainnet gas prices (typically < 0.01 gwei), a full epoch costs well under $0.01. At Ethereum mainnet prices, budget ~$2–10 per epoch.

### When a violation fires

If any position drops below 150%:
1. Agent detects it in the next epoch (within 60 seconds)
2. A **failing** proof is generated and recorded on-chain — `isCompliant: false`
3. The `ViolationRecorded` event fires — your monitoring system can subscribe
4. The AI reasoning records exactly which position failed, at which block, with what ratio
5. The record is permanent — there is no way to delete it

This is by design. A permanent, honest violation record is better for your compliance posture than a missing one — it proves you detected and recorded the issue rather than ignored it.

---

## Customisation Points

| What | How |
|------|-----|
| Different collateral token (not WETH) | Update `wethPriceInUSDC` calculation in `chain_tools.py` |
| Non-150% ratio requirement | Update `min_ratio_bps` in `Prover.toml` generation — the circuit accepts it as a public input |
| More than 16 positions | Deepen the Merkle tree to 5 levels (32 positions) or 6 levels (64 positions) and recompile the Noir circuit |
| Different jurisdiction label | Pass `"EU-MICA"`, `"FATF"`, or any string to `requestComplianceProof()` |
| Proof interval other than 60s | `python main.py --interval 300` for every 5 minutes |
| Custom dashboard branding | Fork `dashboard/` — all contracts, hooks, and addresses are in `.env.local` |

---

## Security Checklist Before Mainnet

- [ ] Agent wallet holds only enough ETH for gas — not protocol funds
- [ ] `setAgentAddress` is called from the deployer wallet, then deployer key is rotated/cold-stored
- [ ] `ComplianceRegistry` and `RegulatorPortal` `owner` is a multisig, not a hot wallet
- [ ] Proof generation server is isolated from user-facing infrastructure
- [ ] `.env` file with `AGENT_PRIVATE_KEY` is never committed to git
- [ ] Consider a 6-month security audit of the Noir circuit before mainnet with real user funds
- [ ] Set up monitoring on `ERROR` lines in agent logs + alert on missed epochs

---

## Support and Contact

For integration questions, circuit customisation, or enterprise deployment support, contact the Provium team. The codebase is fully open — every component in this repo is the working production code, not a demo.
