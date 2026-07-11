"""
demo_regulator_flow.py - narrated walkthrough of the full regulator flow:

    regulator requests a proof  ->  agent detects it  ->  agent proves & fulfills
    ->  regulator reads the on-chain result + compliance dossier.

Runs in DRY-RUN by default (no chain writes, no nargo) so it works anywhere and
explains each on-chain interaction. With a funded agent wallet + Noir toolchain
on Linux, run the real thing via `python main.py --once`.

Run:  cd agent && python demo_regulator_flow.py
"""
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
os.environ["ZKCOMPLY_DRY_RUN"] = "1"

from tools.poseidon2 import poseidon2_selftest
from tools.proof_tools import build_merkle_tree_and_inputs
from tools.fileverse_tools import build_compliance_dossier
from tools.ensip25 import get_ensip25_text_key

BAR = "=" * 66


def step(n, title):
    print(f"\n{'-' * 66}\n  STEP {n}: {title}\n{'-' * 66}")


def main():
    print(BAR)
    print("  Provium - REGULATOR FLOW DEMO (dry-run narration)")
    print(BAR)
    poseidon2_selftest()

    # A simulated pending request as RegulatorPortal.getPendingRequests() would return.
    request = {
        "requestId": 3,
        "requestor": "0xREGULATOR000000000000000000000000000000A",
        "proofType": 0,
        "targetBlock": 8_294_801,
        "jurisdiction": "US-GENIUS-ACT",
        "deadline": int(time.time()) + 1800,
        "seconds_until_deadline": 1800,
    }

    step(1, "Regulator submits an on-chain compliance request")
    print("  RegulatorPortal.requestComplianceProof(proofType=0, targetBlock, "
          "jurisdiction='US-GENIUS-ACT')")
    print(f"  -> request #{request['requestId']} created, 30-minute fulfillment window opens.")
    print(f"  -> 5-minute per-address cooldown enforced on-chain (anti-spam).")

    step(2, "Agent Watcher detects the pending request")
    print(f"  get_pending_regulator_requests() -> 1 pending (id={request['requestId']}, "
          f"deadline in {request['seconds_until_deadline'] // 60}m)")
    print("  on-chain strings (jurisdiction, requestor) are sanitized before ANY LLM sees them")
    print("  (prompt-injection defense: _sanitize_jurisdiction allowlists the code).")

    step(3, "Agent Analyst decides to fulfill (trigger=2, regulator_request)")
    print("  Analyst emits an action with request_id=3, trigger=2, and on-chain reasoning text.")
    print("  Orchestrator validates request_id against the REAL pending set (known_request_ids)")
    print("  so a hallucinated id is dropped, never fulfilled.")

    step(4, "Agent Reporter builds the proof inputs")
    positions = {"block": request["targetBlock"], "positions": [
        {"collateral_wei": str(4 * 10**18), "debt_usdc6": str(2000 * 10**6)},
        {"collateral_wei": str(6 * 10**18), "debt_usdc6": str(2500 * 10**6)},
    ]}
    tree = json.loads(build_merkle_tree_and_inputs(json.dumps(positions)))
    print(f"  Poseidon2 Merkle root : {tree['root'][:34]}...")
    print(f"  total_collateral      : {tree['total_collateral']} wei")
    print(f"  total_debt            : {tree['total_debt']} (USDC-6)")
    print(f"  aggregate ratio       : {tree['ratio_bps'] / 100:.1f}%  (threshold 150%)")
    print("  [dry-run] commitPositionRoot + nargo/bb proof generation skipped.")

    step(5, "Agent fulfills the request on-chain")
    print("  RegulatorPortal.fulfillRequest(requestId=3, proof, publicInputs, reasoning)")
    print("  On-chain guarantees enforced BEFORE the request is marked fulfilled:")
    print("    * UltraVerifier.verify(proof, publicInputs) must pass")
    print("    * publicInputs[0] == LendingProtocol.currentPositionRoot()  (live positions)")
    print("    * publicInputs[1] == requiredRatioBps (15000)")
    print("    * publicInputs[5] == the LendingProtocol address")
    print("    * block.timestamp <= deadline  (30-min window)")

    step(6, "Agent packages a compliance dossier (Fileverse / local)")
    dossier = build_compliance_dossier(
        epoch_number=42,
        action={"urgency": "urgent", "trigger": 2, "request_id": 3,
                "agent_reasoning": "Fulfilling regulator request #3. Aggregate ratio "
                                   f"{tree['ratio_bps'] / 100:.1f}%. All positions >= 150%. COMPLIANT."},
        reporter_result={"steps": [{"step": "zk_proof", "is_compliant": True, "time": 31.4}]},
        watcher_data={"positions_data": {"user_count": 2,
                                         "aggregate_ratio_pct": tree["ratio_bps"] / 100,
                                         "min_health_factor_bps": 16000}, "risk_level": "low"},
        submit_result={"tx_hash": "0xDRYRUN", "block_number": request["targetBlock"],
                       "verified_on_chain": True},
    )
    print(f"  dossier schema   : {dossier['schema']}")
    print(f"  content hash     : sha256:{dossier['content_hash'][:24]}...")
    print(f"  jurisdiction     : {dossier['jurisdiction']}")

    step(7, "Regulator verifies the agent identity (ENSIP-25)")
    reg = "0xFbE3F85Ab541Cd538542B543E87706D00e1f7013"
    key = get_ensip25_text_key(reg, "1", 84532)
    print("  Resolve the ENS text record on provium-agent.eth:")
    print(f"    {key[:58]}...")
    print("  Non-empty value -> the on-chain agent is the rightful ENS controller.")

    print("\n" + BAR)
    print("  Flow complete. Regulator has: on-chain fulfilled request + verifiable")
    print("  ZK proof + rich dossier + cryptographic agent identity - no private")
    print("  position data ever disclosed.")
    print(BAR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
