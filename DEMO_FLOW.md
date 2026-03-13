# Provium — Hackathon Demo User Flow

> **Who reads this:** You, standing at the laptop during the demo. Keep this open beside you.
> **Total time:** ~5 minutes. Stick to it.

---

## Before You Start Demoing

### Pre-flight checklist (do this 10 minutes before)

- [ ] Agent is running: `python main.py` — confirm you see `[WATCHER]` lines in the terminal
- [ ] Dashboard is running: `npm run dev` inside `/dashboard` — open at `http://localhost:3000`
- [ ] Wallet connected in the browser (MetaMask on Base Sepolia)
- [ ] Agent wallet has ETH for gas — check Basescan
- [ ] Have `https://sepolia.basescan.org/address/YOUR_COMPLIANCE_REGISTRY` ready in a tab
- [ ] Keep the terminal visible in one half of the screen — judges love seeing live logs

---

## The 3 User Roles You Will Play

During the demo you switch between three personas. Make this explicit to the judges.

| Persona | Who they are | What they do in the UI |
|---------|-------------|----------------------|
| 🏦 **Protocol Team** | The DeFi lending team using Provium | Views Overview + Proof History |
| 🏛️ **Regulator** | SEC / CFTC auditor | Submits request on Regulator Portal |
| 💥 **Attacker** | Position drops below threshold | Triggers violation on Simulate page |

---

## Page 1 — Landing Page `/`

**Time: 30 seconds**

**What to say:**
> *"This is Provium's homepage. On the right side you can see a live terminal card — that's not a mockup. Those are the actual three AI agents — Watcher, Analyst, Reporter — running right now on Base Sepolia. You can see the timestamps, which agent is talking, and a proof landing as a transaction hash on-chain. The compliance status shows 171% — above the GENIUS Act's 150% minimum requirement."*

**What to point at:**
- The **● COMPLIANT** badge with the **171%** ratio number
- The **[WATCHER] → [ANALYST] → [REPORTER] → ✓ PROOF → ⛓ TX** log lines in the hero card
- The live ticker below the headline (proof count, last block)

**Then:** Click **"Open Dashboard →"** button

---

## Page 2 — Overview `/dashboard/overview`

**Time: 45 seconds**

**Persona: 🏦 Protocol Team**

**What to say:**
> *"This is what the protocol's compliance officer sees every morning. The aggregate collateral ratio, total positions being monitored, and the last proof timestamp. The agent wallet address in the bottom-left sidebar is a real wallet on Base Sepolia — click 'View on Basescan' and you'll see every transaction it has ever sent. Every proof submission, live, forever."*

**What to point at:**
- Compliance status card (green = compliant, ratio %)
- Agent wallet at the bottom of the sidebar
- The **"View on Basescan ↗"** link — open it in a new tab, show real txns
- The "LIVE" pulsing dot in the top bar

**Key message:** *"The protocol team doesn't have to do anything. This updates itself every 60 seconds."*

---

## Page 3 — Proof History `/dashboard/proofs`

**Time: 30 seconds**

**Persona: 🏦 Protocol Team**

**What to say:**
> *"Every proof the agent has generated is here — the block it was proven at, the ratio it proved, pass or fail, and the AI reasoning the agent wrote at the time. This is the permanent compliance record. Notice the red badge on 'Proof History' in the sidebar — that's a live websocket subscription. When a new proof lands on-chain, the badge increments in real time. No page refresh."*

**What to point at:**
- The table rows — block number, ratio (e.g. 171%), ✅ COMPLIANT status
- The **notification badge** on the sidebar Proof History link
- Click a row to expand and show the **agentReasoning** text — the plain-English AI explanation tied to that block

**Key message:** *"A regulator can read this. A judge can read this. Ten years from now."*

---

## Page 4 — Regulator Portal `/dashboard/regulator`

**Time: 90 seconds** ← this is your showcase moment

**Persona: 🏛️ Regulator**

**What to say:**
> *"Now I'm the regulator — say, an SEC compliance officer. I want cryptographic proof that this protocol meets the GENIUS Act's 150% collateral requirement. I come here, I connect my wallet, I pick 'Collateral Ratio', I pick 'US-GENIUS-ACT' jurisdiction, and I hit Submit."*

**Steps to perform:**
1. Connect wallet (MetaMask — should already be connected)
2. Proof Type → **Collateral Ratio (150% minimum)** is pre-selected ✓
3. Target Block → leave blank (uses latest block)
4. Jurisdiction → click **US-GENIUS-ACT**
5. Click **"Submit On-Chain →"**
6. MetaMask pops up → confirm the transaction
7. Green banner appears: *"Request submitted on-chain. The agent will automatically fulfill it in ~60 seconds."*

**Then: wait.** Talk through what's happening:
> *"That transaction just went to our RegulatorPortal smart contract on Base Sepolia. The agent polls for pending requests every epoch. It will detect this within 60 seconds, generate a ZK proof specifically for this request, and fulfill it — all automatically."*

**When fulfilled** (watch the RequestList panel on the right update):
> *"There it is. Fulfilled. The regulator now has: a proof hash they can re-verify against the UltraVerifier contract, the collateral ratio, the block it was proven at, and AI reasoning explaining the decision — all on-chain, all permanent, zero user data."*

**What to point at:**
- The submitted request appearing in the **Request List** on the right
- The status flipping from `PENDING` → `FULFILLED`
- The `agentReasoning` text that appears — read it aloud, it's plain English
- The Basescan link for the fulfillment transaction

---

## Page 5 — Simulate `/dashboard/simulate`

**Time: 90 seconds** ← the dramatic moment

**Persona: 💥 Attacker / Bad State**

**What to say:**
> *"Now I'm going to show you what happens when a position actually goes bad. This simulator artificially drops one user's collateral value to zero — below the 150% minimum. In a real protocol this would be a price crash or an exploit. Watch the terminal."*

**Steps to perform:**
1. Target user address → leave blank (uses seeded test address shown in placeholder)
2. Click **"Trigger Value Flash"**
3. MetaMask pops up → confirm
4. The **Attack Vector Status** panel on the right lights up step by step:
   - 🔴 *Collateral flashed to zero*
   - 🔵 *Watcher detects ratio drop* (spinner: "Agent working...")
   - 🟣 *Noir proof generated*
   - 🟢 *Violation logged on-chain*

**When the violation proof lands** (red toast fires in bottom-right):
> *"Red toast — VIOLATION proof submitted. The agent caught it in one epoch, under 60 seconds. A failing proof is now permanently on-chain. There is no delete button. This record cannot be changed."*

**Why this matters — say this:**
> *"A permanent, honest violation record is actually better for the protocol than a missing one. It proves they detected and recorded the issue rather than covered it up. Regulators can see this. The data is public. Nobody needs to trust Provium — they trust the chain."*

**Then:** Go to Basescan and show the `ViolationRecorded` event in the contract logs.

---

## The Close — Basescan Direct

**Time: 30 seconds**

**What to say:**
> *"Everything I just showed you is on-chain. No API. No Provium server you have to trust. Open Basescan, search the ComplianceRegistry address, hit 'Read Contract', call `getAllReports()`. Every proof, every violation, every piece of AI reasoning — readable by any court, any regulator, any auditor, forever. That's the point. The math never lies. The agent never sleeps. The chain never forgets."*

**Open:** `https://sepolia.basescan.org/address/YOUR_COMPLIANCE_REGISTRY_ADDRESS`
- Read Contract → `getAllReports()` → show the array of reports
- Click a tx hash → show the `ReportSubmitted` event with the agentReasoning in the logs

---

## Timing Summary

| Page | Time | Persona |
|------|------|---------|
| Landing `/` | 30s | — |
| Overview `/dashboard/overview` | 45s | 🏦 Protocol Team |
| Proof History `/dashboard/proofs` | 30s | 🏦 Protocol Team |
| Regulator Portal `/dashboard/regulator` | 90s | 🏛️ Regulator |
| Simulate `/dashboard/simulate` | 90s | 💥 Attacker |
| Basescan close | 30s | — |
| **Total** | **~5 min** | |

---

## If Something Goes Wrong

| Problem | Fix |
|---------|-----|
| Agent not running | Open terminal, `python main.py`, wait 10s, retry |
| Proof taking > 90 seconds | Tell judges: *"Barretenberg prover on a small VPS — production would be faster. The proof is mathematically correct."* |
| MetaMask stuck | Reject and resubmit — Base Sepolia sometimes needs a fresh nonce  |
| Regulator request not fulfilling | Check agent terminal for errors — usually RPC timeout, agent will retry next epoch |
| Dashboard not loading data | Confirm `NEXT_PUBLIC_*` addresses in `.env.local` match your `deployments/base-sepolia.json` |

---

## One-Line Answers for Hard Judge Questions

**"Can the agent fake a proof?"**
> No. The Noir circuit's `assert` constraints are enforced by Barretenberg. It's mathematically impossible to generate a valid proof for an undercollateralised state — same as breaking elliptic curve cryptography.

**"What's the point of AI reasoning if ZK proofs are deterministic?"**
> The ZK proof proves the *what* — the math. The AI reasoning proves the *why* — which specific positions, which epoch, what OFAC context was checked, what decision was made. Together they give regulators both machine-verifiable proof and human-readable context. No other system has both on-chain simultaneously.

**"Does this scale?"**
> The Merkle tree is currently 4 levels deep (16 positions). Add one level → 32. Two levels → 64. The circuit recompiles in minutes. The contracts don't change.

**"Why testnet?"**
> Mainnet with real user funds requires a 6-month security audit of the Noir circuit before touching them. That's the responsible answer, not a limitation of the architecture. Switching is one env variable.
