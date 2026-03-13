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
