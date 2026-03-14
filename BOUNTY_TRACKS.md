# Provium — Bounty Track Mapping

## Track 1 — ENS

Provium now uses ENS in two layers:

1. **Human-readable identity**
   - The dashboard resolves protocol, regulator, and agent addresses to ENS names.
2. **Programmable DeFi metadata**
   - The dashboard can read arbitrary ENS text records such as:
     - `provium.interface`
     - `provium.privacy`
     - `provium.swapPreference`
     - `provium.compliancePolicy`
     - `provium.role`
     - `provium.proofMode`
     - `provium.bitgoRail`

This makes ENS a live metadata registry for how the protocol should be understood and operated, not just a prettier address format.

### ENSIP-25 — AI Agent Registry ENS Name Verification

Provium implements [ENSIP-25](https://docs.ens.domains/ensip/25/) to cryptographically tie the compliance agent's ENS name to its on-chain registry entry in `ComplianceRegistry`.

**What ENSIP-25 adds:**
- The agent's ENS name (e.g. `provium-agent.eth`) sets a single text record:
  ```
  Key:   agent-registration[<erc7930_registry_address>][<agentId>]
  Value: 1
  ```
- `<erc7930_registry_address>` is the ComplianceRegistry address on Base Sepolia, encoded as an [ERC-7930 interoperable address](https://github.com/ethereum/ercs/blob/master/ERCS/erc-7930.md):
  ```
  Format: 0x | 0001 (EIP-155 ns) | 0000 (reserved)
             | <chainIdByteLen:1B> | <chainId↑big-endian>
             | 0x14 (addrLen=20)  | <address:20B>
  ```
- Any dApp, protocol, or regulator resolves this record in one ENS lookup — no third-party trust, no API, just ENS.

**Verification flow (ENSIP-25 §4.2):**
1. Obtain the claimed ENS name + agentId + registry address from the ComplianceRegistry entry
2. Build key: `agent-registration[<erc7930Registry>][<agentId>]`
3. Resolve text record on the claimed ENS name (mainnet ENS resolver)
4. Non-empty value → agent is verified ✓

**Where it is implemented:**
- `agent/tools/ensip25.py` — Python: ERC-7930 encoding, text key generation, setup CLI
- `dashboard/lib/hooks/useEnsip25Verification.ts` — React: TypeScript ERC-7930 encoder + wagmi hook
- `dashboard/components/Ensip25Badge.tsx` — UI: verification badge shown on the ENS/Tracks page
- `dashboard/components/dashboard/EnsProfileCard.tsx` — integrated into the Agent Identity panel

**At agent startup**, the orchestrator logs the exact text record to set:
```
[ENSIP-25] Agent verification text record for ENS:
  ENS name  : provium-agent.eth
  Key       : agent-registration[0x00010000...14<registryAddr>][1]
  Value     : 1
```

**Why this matters for BitGo:**
ENSIP-25 gives the BitGo-secured execution flow an identity layer. Any protocol interacting with the agent via BitGo can verify the agent's ENS name before trusting the proof submission — combining enterprise-grade wallet security with ENS-backed identity.

### Suggested ENS setup

- `provium.eth` → protocol profile
- `provium-agent.eth` → autonomous agent profile

Suggested text records:

- `provium.interface=https://provium.xyz/dashboard`
- `provium.privacy=ZK proofs only; no raw positions exposed`
- `provium.swapPreference=Base-native routing`
- `provium.compliancePolicy=US-GENIUS-ACT 150% collateral minimum`
- `provium.role=Autonomous compliance agent`
- `provium.proofMode=BN254 Poseidon Merkle proof`
- `provium.bitgoRail=BitGo multi-sig submission enabled`

---

## Track 2 — BitGo

Provium fits the BitGo privacy track directly:

- The application proves wallet-set compliance without revealing private positions.
- Proof submissions can be routed through BitGo wallet infrastructure.
- The agent still generates ZK proofs, but execution uses an enterprise wallet rail.

### What is implemented

- `agent/tools/bitgo_tools.py` contains BitGo REST integration.
- `agent/tools/submit_tools.py` now attempts BitGo-first transaction submission before falling back to `eth_account`.
- The orchestrator logs BitGo status every epoch.

### Required env vars

In `agent/.env`:

- `BITGO_ACCESS_TOKEN`
- `BITGO_WALLET_ID`
- `BITGO_WALLET_PASSPHRASE`
- `BITGO_ENV=test`
- `BITGO_COIN=tbaseeth`

---

## Track 3 — Base

Provium is already a strong Base submission:

- Contracts deployed on Base Sepolia
- Dashboard reads Base live state
- Agent writes compliance proofs to Base
- Regulator flow runs on Base

### Base-native story

Provium is a DeFi compliance coordination layer built around Base execution:

- low-cost proof publication
- live DeFi protocol monitoring
- regulator-facing request fulfillment
- on-chain proof verification

---

## Recommended demo order

1. Show Base contracts and dashboard
2. Show ENS-powered protocol + agent identity on the Bounty Tracks page
3. Show BitGo-secured proof rail configuration
4. Trigger a proof or regulator request
5. Show on-chain reasoning and verification result
