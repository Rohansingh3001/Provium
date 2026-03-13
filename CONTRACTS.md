# Contracts Module — `contracts/`

Four Solidity contracts on Base Sepolia. Standard OpenZeppelin — no chain-specific opcodes. Moving to mainnet is one RPC URL change.

---

## Directory Layout

```
contracts/
├── src/
│   ├── LendingProtocol.sol      # Mock lending protocol — positions + Merkle root commit
│   ├── ComplianceRegistry.sol   # Stores ZK proofs + AI reasoning permanently on-chain
│   ├── RegulatorPortal.sol      # On-chain regulator request queue
│   ├── UltraVerifier.sol        # 247 KB — auto-generated from Noir circuit by Barretenberg
│   ├── MockUSDC.sol             # ERC-20 test token
│   └── MockWETH.sol             # ERC-20 test token
│
├── scripts/
│   ├── deploy.ts                # Deploys all four contracts, writes deployments/base-sepolia.json
│   ├── seed.ts                  # Seeds positions (5 users with collateral ratios ~163-200%)
│   ├── seed_remaining.ts        # Seeds additional positions
│   ├── setup_post_deploy.ts     # Sets agent address, verifier address
│   ├── setup_post_deploy2.ts    # Additional post-deploy configuration
│   └── compile-circuit.ts       # Helper to invoke nargo from Hardhat
│
├── deployments/
│   └── base-sepolia.json        # Live deployed addresses (read by agent + dashboard)
│
├── hardhat.config.ts            # Hardhat config — compiler versions, Base Sepolia network
└── package.json
```

---

## Contract 1 — `LendingProtocol.sol`

The mock lending protocol that simulates real user positions.

### Purpose
Provides on-chain state the agent reads. In production, this is replaced by an integration with Aave, Compound, or a real lending protocol.

### Key State
```solidity
struct Position {
    uint256 collateral;    // WETH in wei
    uint256 debt;          // USDC in 10^6 units
    bool active;
}
mapping(address => Position) public positions;
bytes32 public currentPositionRoot;  // Poseidon2 Merkle root committed by agent
```

### Key Functions

| Function | Who Calls | Description |
|----------|-----------|-------------|
| `deposit(wethAmount)` | Users | Add collateral |
| `borrow(usdcAmount)` | Users | Draw debt |
| `commitPositionRoot(root, blockNumber)` | Agent | Commits Merkle root before proving |
| `triggerUndercollateralization(user, newDebt)` | Agent/Demo | Simulates a violation (demo only) |
| `getAllActivePositions()` | Agent (read) | Returns all active addresses, collaterals, debts |
| `getHealthFactor(user)` | Agent (read) | Returns health factor in BPS (15000 = 150%) |

### Violation Demo Flow

`triggerUndercollateralization()` directly injects a bad debt amount for one position — bypassing the normal borrow limit — so the demo can show a real violation being caught and recorded.

---

## Contract 2 — `ComplianceRegistry.sol`

The core on-chain ledger. Every ZK proof ever generated is stored here permanently.

### Purpose
An immutable, auditable record of every compliance check. Regulators, auditors, and judges can read it directly from the blockchain — no API, no company to trust.

### Key Struct
```solidity
struct ComplianceReport {
    uint256 reportId;
    uint8 proofType;         // 0 = collateral ratio, 1 = OFAC check
    uint8 trigger;           // 0 = routine, 1 = urgent, 2 = regulator request
    uint256 blockNumber;     // which block the positions were read from
    bytes32 proofHash;       // keccak256 of the proof bytes
    bool isCompliant;        // true = compliant, false = VIOLATION
    uint256 totalCollateral; // aggregate collateral (public ZK input)
    uint256 totalDebt;       // aggregate debt (public ZK input)
    uint256 ratioBps;        // computed ratio (e.g. 17100 = 171%)
    string jurisdiction;     // "US-GENIUS-ACT", "EU-MICA", etc.
    string agentReasoning;   // Plain-English AI explanation — stored forever
    uint256 timestamp;       // block.timestamp
    address agentAddress;    // which wallet submitted this
    uint256 requestId;       // 0 if routine, >0 if fulfilling a regulator request
}
```

### ZK Verification on `submitReport`

```solidity
if (isCompliant && address(ultraVerifier) != address(0)) {
    require(ultraVerifier.verify(proof, publicInputs), "ZK proof verification failed");
}
```

**If the agent claims compliance, the proof is verified on-chain.** A false proof for a compliant state cannot pass — the `UltraVerifier` enforces BN254 PlonK constraints. Violations (`isCompliant=false`) are always stored without proof verification — a violation doesn't need a proof.

### Events

```solidity
event ReportSubmitted(reportId, proofType, isCompliant, agentReasoning, ratioBps)
event ViolationRecorded(reportId, proofType, blockNumber, ratioBps)
```

`ReportSubmitted` is what the dashboard's `useWatchContractEvent` subscribes to for real-time toast notifications.

### Key View Functions

| Function | Returns |
|----------|---------|
| `getReport(id)` | Full `ComplianceReport` struct |
| `getAllReports()` | All reports array |
| `getLatestReport()` | Most recent report |
| `isCurrentlyCompliant()` | Latest report's `isCompliant` bool |
| `getReportCount()` | Total number of reports |

---

## Contract 3 — `RegulatorPortal.sol`

Allows external parties (regulators, auditors) to submit on-chain compliance requests.

### Purpose
A permissionless request queue. Any address can post a request with a jurisdiction and deadline. The agent detects pending requests every epoch and prioritises them in the Analyst's decision.

### Key Struct
```solidity
struct ComplianceRequest {
    uint256 requestId;
    address requestor;
    string jurisdiction;    // "US-GENIUS-ACT", "EU-MICA", "FATF"
    uint256 deadline;       // block.timestamp + requestor's window
    uint256 targetBlock;    // which block the proof should reference
    bool fulfilled;
    bytes32 proofHash;      // set when fulfilled
    string agentReasoning;  // AI response stored on fulfillment
    uint256 timestamp;
}
```

### Key Functions

| Function | Who | Description |
|----------|-----|-------------|
| `submitRequest(jurisdiction, targetBlock, deadline)` | Regulator | Creates a new request, emits `RequestSubmitted` |
| `fulfillRequest(requestId, proof, publicInputs, agentReasoning)` | Agent | Marks fulfilled, stores proof + reasoning |
| `getPendingRequests()` | Agent (read) | Returns all unfulfilled requests |
| `getRequest(id)` | Anyone | Returns full request struct |

### Events

```solidity
event RequestSubmitted(requestId, requestor, jurisdiction, deadline)
event RequestFulfilled(requestId, requestor, proofHash, agentReasoning)
```

---

## Contract 4 — `UltraVerifier.sol`

**Auto-generated** by Barretenberg from the Noir circuit. 247 KB. Do not edit by hand.

### Purpose
On-chain BN254 PlonK verifier. Called by `ComplianceRegistry.submitReport()`. Accepts or rejects a proof in a single transaction.

### How It's Generated

```bash
# From repo root:
bash regen_verifier.sh

# Which runs:
nargo compile
bb write-vk -b target/collateral_proof.json -o target/vk
bb contract -o ../contracts/src/UltraVerifier.sol
```

`bb` is the Barretenberg CLI. The contract is a fixed Solidity verifier for the specific circuit's verification key.

### Why It's 247 KB

The verifier contains the verification key (BN254 group elements and polynomial commitments) hardcoded as constants. Deploying it costs ~3M gas on Base Sepolia but is a one-time cost. Subsequent `verify()` calls are ~200k gas.

---

## Deployment — `scripts/deploy.ts`

Deploys in this order (order matters — dependencies between contracts):

1. `MockWETH` → `MockUSDC` (ERC-20 tokens)
2. `UltraVerifier` (needs no constructor args)
3. `LendingProtocol(weth, usdc)` (needs token addresses)
4. `ComplianceRegistry(ultraVerifier)` (needs verifier address)
5. `RegulatorPortal()` (standalone)

After deployment, writes `deployments/base-sepolia.json`:

```json
{
  "LendingProtocol":    "0x...",
  "ComplianceRegistry": "0x...",
  "RegulatorPortal":    "0x...",
  "UltraVerifier":      "0x...",
  "MockWETH":          "0x...",
  "MockUSDC":          "0x..."
}
```

This file is read by both the agent (`DEPLOYMENTS_PATH` env var) and the dashboard (`.env.local`).

### Post-Deploy Setup

```bash
npx hardhat run scripts/setup_post_deploy.ts --network baseSepolia
npx hardhat run scripts/seed.ts --network baseSepolia
```

`setup_post_deploy.ts` — calls `ComplianceRegistry.setAgentAddress(agentWallet)` and `RegulatorPortal.setAgentAddress(agentWallet)`. Without this, the agent's `submitReport` and `fulfillRequest` calls will revert.

`seed.ts` — deposits WETH and borrows USDC for 5 test users, creating positions with health factors 163–200%.

---

## Hardhat Config — `hardhat.config.ts`

Two compiler versions because `UltraVerifier.sol` uses newer Solidity features:

```typescript
solidity: {
    compilers: [{ version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "paris" }}],
    overrides: {
        "src/UltraVerifier.sol": {
            version: "0.8.27",
            settings: { optimizer: { enabled: true, runs: 1 }, viaIR: false, evmVersion: "cancun" }
        }
    }
}
```

`runs: 1` for `UltraVerifier` because it's called once per proof submission — optimising for deployment size over runtime cost is correct here.

---

## Moving to Mainnet

The contracts are chain-agnostic. The only required changes:

1. `hardhat.config.ts` — add a `mainnet` network config
2. `contracts/.env` — set `DEPLOYER_PRIVATE_KEY` and `BASE_RPC` (or Ethereum mainnet RPC)
3. `agent/.env` — update `BASE_SEPOLIA_RPC` to mainnet RPC, `DEPLOYMENTS_PATH` to new deployment file
4. `dashboard/.env.local` — update contract addresses

Re-run `scripts/deploy.ts` on the target network. Everything else is identical.
