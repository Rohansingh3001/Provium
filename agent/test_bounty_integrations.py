"""
test_bounty_integrations.py - standalone end-to-end check of the three bounty
integrations (BitGo, Fileverse, ENSIP-25) plus the Poseidon2/Merkle core.

Unlike test_provium.py (pytest), this is a single script that prints a human
readable report and exits 0/1. Safe to run anywhere - no RPC, key, or nargo.

Run:  cd agent && python test_bounty_integrations.py
"""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
os.environ.setdefault("ZKCOMPLY_DRY_RUN", "1")

PASS, FAIL = "  [PASS]", "  [FAIL]"
_failures = []


def check(name, cond):
    print((PASS if cond else FAIL), name)
    if not cond:
        _failures.append(name)
    return cond


def section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


# -- Poseidon2 / Merkle core ------------------------------------------
section("Poseidon2 + Merkle core (matches Noir circuit)")
from tools.poseidon2 import poseidon2_permutation, poseidon2_hash_2, poseidon2_selftest
from tools.proof_tools import build_merkle_tree_and_inputs

check("Poseidon2 self-test matches Barretenberg test vector", poseidon2_selftest())
_tv = poseidon2_permutation([0, 1, 2, 3])[0]
check("perm([0,1,2,3])[0] == known vector",
      _tv == int("0x01bd538c2ee014ed5141b29e9ae240bf8db3fe5b9a38629a9647cf8d76c01737", 16))
check("hash_2 is order-sensitive", poseidon2_hash_2(1, 2) != poseidon2_hash_2(2, 1))

_pos = json.dumps({"block": 1, "positions": [
    {"collateral_wei": str(3 * 10**18), "debt_usdc6": str(1000 * 10**6)},
    {"collateral_wei": str(5 * 10**18), "debt_usdc6": str(2000 * 10**6)},
]})
_tree = json.loads(build_merkle_tree_and_inputs(_pos))
check("Merkle tree builds without error", "error" not in _tree)
check("Merkle root is a field element", _tree.get("root", "").isdigit())
check("Prover.toml exposes 6 public inputs",
      all(k in _tree.get("prover_toml_content", "")
          for k in ("positions_root", "min_ratio_bps", "total_collateral",
                    "total_debt", "block_number", "protocol_address")))


# -- BitGo ------------------------------------------------------------
section("BitGo - multi-sig custody")
from tools.bitgo_tools import get_bitgo_wallet_info, BitGoMockClient, send_via_bitgo

_info = get_bitgo_wallet_info()
check("get_bitgo_wallet_info() returns a status dict", isinstance(_info, dict))
check("gracefully reports disabled when unconfigured OR enabled when set",
      "bitgo_enabled" in _info)
_mock = BitGoMockClient()
_w = _mock.get_wallet()
check("mock wallet is 2-of-3 multi-sig", len(_w.get("keys", [])) == 3)
_tx = _mock.send_transaction("0xabc", 0, "0xdead")
check("mock send_transaction returns a txid", _tx.get("txid", "").startswith("0x"))
check("calldata builder concatenates selector+args",
      _mock.build_evm_calldata("12345678", "00ff") == "0x1234567800ff")


# -- Fileverse --------------------------------------------------------
section("Fileverse - decentralized evidence storage")
import tools.fileverse_tools as fv
from tools.fileverse_tools import build_compliance_dossier, get_fileverse_status

_dossier = build_compliance_dossier(
    epoch_number=1,
    action={"urgency": "routine", "trigger": 0, "request_id": 0, "agent_reasoning": "Healthy."},
    reporter_result={"steps": [{"step": "zk_proof", "is_compliant": True, "time": 10.0}]},
    watcher_data={"positions_data": {"user_count": 2, "aggregate_ratio_pct": 250.0,
                                     "min_health_factor_bps": 25000}, "risk_level": "low"},
    submit_result={"tx_hash": "0xfeed", "block_number": 5, "verified_on_chain": True},
)
check("dossier schema is provium-compliance-dossier-v1",
      _dossier["schema"] == "provium-compliance-dossier-v1")
check("dossier has a sha256 content hash", len(_dossier.get("content_hash", "")) == 64)
check("dossier references Basescan tx", "basescan.org" in _dossier["chain"]["basescan_url"])

with tempfile.TemporaryDirectory() as td:
    fv.DOSSIER_DIR = Path(td)
    _saved = fv._save_to_local(_dossier)
    check("dossier local fallback writes a file",
          _saved["source"] == "local" and (Path(td) / _saved["file_id"]).exists())
check("get_fileverse_status() returns a mode", "mode" in get_fileverse_status())


# -- ENSIP-25 ---------------------------------------------------------
section("ENSIP-25 - AI agent ENS identity")
from tools.ensip25 import encode_erc7930_address, get_ensip25_text_key, verify_ensip25_text_key

_reg = "0xFbE3F85Ab541Cd538542B543E87706D00e1f7013"
_enc = encode_erc7930_address(84532, _reg)
check("ERC-7930 encodes Base Sepolia chain id (0x014a34)", "03014a34" in _enc.lower())
check("ERC-7930 ends with the registry address", _enc.lower().endswith(_reg.lower()[2:]))
_key = get_ensip25_text_key(_reg, "1", 84532)
check("text key has agent-registration[...][1] form",
      _key.startswith("agent-registration[0x") and _key.endswith("][1]"))
check("verification passes for non-empty value", verify_ensip25_text_key("1") is True)
check("verification fails for empty value", verify_ensip25_text_key("") is False)


# -- Summary ----------------------------------------------------------
section("Summary")
if _failures:
    print(f"  {len(_failures)} check(s) FAILED:")
    for f in _failures:
        print(f"    - {f}")
    sys.exit(1)
print("  All bounty-integration checks PASSED.")
sys.exit(0)
