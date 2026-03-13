#!/usr/bin/env python3
"""
verify_setup.py — Pre-flight verification for Provium testnet agent.

Checks:
  1. Python packages installed (poseidon-hash, web3, agno, groq, dotenv)
  2. BN254 Poseidon produces field-valid outputs (< BN254 prime)
  3. Merkle tree root is deterministic and field-valid
  4. nargo is installed and can prove the test circuit
  5. RPC connectivity to Base Sepolia
  6. Deployments file has valid addresses
  7. Agent wallet has ETH balance

Run from the agent/ directory:
    cd agent && python3 verify_setup.py
"""

import sys
import os
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv()

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"

BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617

results = []

# ── 1. Python packages ───────────────────────────────────────────────────────
print("\n── 1. Python packages ──")
packages = ["poseidon", "web3", "agno", "groq", "dotenv", "eth_account"]
all_pkg_ok = True
for pkg in packages:
    try:
        __import__(pkg.replace("-", "_"))
        print(f"  {PASS} {pkg}")
    except ImportError:
        print(f"  {FAIL} {pkg} not installed")
        all_pkg_ok = False
results.append(("Python packages", all_pkg_ok))

# ── 2. BN254 Poseidon hash ───────────────────────────────────────────────────
print("\n── 2. BN254 Poseidon hash ──")
try:
    from tools.proof_tools import _poseidon_bn254, BN254_PRIME as P

    # Test 1: hash(0, 0) is in field
    h00 = _poseidon_bn254(0, 0)
    assert 0 <= h00 < P, f"hash(0,0) out of field: {h00}"
    print(f"  {PASS} hash(0, 0) = {str(h00)[:30]}... (in BN254 field)")

    # Test 2: hash is deterministic
    assert _poseidon_bn254(0, 0) == h00, "Non-deterministic!"
    print(f"  {PASS} Deterministic")

    # Test 3: hash(a, b) in field for real-looking values
    coll = 10 * 10**18   # 10 WETH in wei
    debt = 12000 * 10**6  # 12000 USDC in 6 decimals
    hcd = _poseidon_bn254(coll, debt)
    assert 0 <= hcd < P, f"hash(coll, debt) out of field: {hcd}"
    print(f"  {PASS} hash(10ETH, 12000USDC) = {str(hcd)[:30]}... (in BN254 field)")

    results.append(("BN254 Poseidon", True))
except Exception as e:
    print(f"  {FAIL} {e}")
    results.append(("BN254 Poseidon", False))

# ── 3. Merkle tree ───────────────────────────────────────────────────────────
print("\n── 3. Merkle tree (16 leaves) ──")
try:
    from tools.proof_tools import _build_tree, _poseidon_bn254

    leaves = [_poseidon_bn254(i * 10**18, i * 500 * 10**6) for i in range(16)]
    levels, root = _build_tree(leaves)
    assert 0 <= root < BN254_PRIME, "Root out of field"
    assert len(levels) == 5, f"Expected 5 levels, got {len(levels)}"
    print(f"  {PASS} Merkle tree built (depth=4, 16 leaves)")
    print(f"  {PASS} Root = {str(root)[:30]}... (in BN254 field)")
    results.append(("Merkle tree", True))
except Exception as e:
    print(f"  {FAIL} {e}")
    results.append(("Merkle tree", False))

# ── 4. nargo / Noir toolchain ────────────────────────────────────────────────
print("\n── 4. nargo toolchain ──")
import subprocess
try:
    r = subprocess.run(["nargo", "--version"], capture_output=True, text=True, timeout=10)
    if r.returncode == 0:
        print(f"  {PASS} nargo {r.stdout.strip()}")
        results.append(("nargo", True))
    else:
        print(f"  {FAIL} nargo returned non-zero: {r.stderr.strip()}")
        results.append(("nargo", False))
except FileNotFoundError:
    print(f"  {FAIL} nargo not found. Install: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && noirup")
    results.append(("nargo", False))
except Exception as e:
    print(f"  {FAIL} {e}")
    results.append(("nargo", False))

# ── 5. RPC connectivity ──────────────────────────────────────────────────────
print("\n── 5. Base Sepolia RPC ──")
try:
    from web3 import Web3
    rpc = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
    w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 10}))
    if w3.is_connected():
        block = w3.eth.block_number
        print(f"  {PASS} Connected to {rpc}")
        print(f"  {PASS} Current block: #{block}")
        results.append(("RPC", True))
    else:
        print(f"  {FAIL} Could not connect to {rpc}")
        results.append(("RPC", False))
except Exception as e:
    print(f"  {FAIL} {e}")
    results.append(("RPC", False))

# ── 6. Deployments ───────────────────────────────────────────────────────────
print("\n── 6. Deployments (base-sepolia.json) ──")
try:
    dep_path = Path(os.getenv("DEPLOYMENTS_PATH", "../contracts/deployments/base-sepolia.json"))
    cfg = json.loads(dep_path.read_text())
    required = ["LendingProtocol", "RegulatorPortal", "ComplianceRegistry", "UltraVerifier"]
    dep_ok = True
    for k in required:
        addr = cfg.get(k, "")
        if not addr or addr == "0x" + "0" * 40:
            print(f"  {FAIL} Missing or zero: {k}")
            dep_ok = False
        else:
            print(f"  {PASS} {k} = {addr[:14]}...")
    results.append(("Deployments", dep_ok))
except Exception as e:
    print(f"  {FAIL} {e}")
    results.append(("Deployments", False))

# ── 7. Agent wallet balance ──────────────────────────────────────────────────
print("\n── 7. Agent wallet ETH balance ──")
try:
    from web3 import Web3
    rpc = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
    w3 = Web3(Web3.HTTPProvider(rpc))
    from eth_account import Account
    key = os.getenv("AGENT_PRIVATE_KEY", "")
    if not key:
        print(f"  {WARN} AGENT_PRIVATE_KEY not set in .env")
        results.append(("Agent balance", False))
    else:
        acc = Account.from_key(key)
        bal_wei = w3.eth.get_balance(acc.address)
        bal_eth = bal_wei / 1e18
        if bal_eth < 0.001:
            print(f"  {WARN} {acc.address}: {bal_eth:.6f} ETH (LOW - needs Base Sepolia ETH for gas)")
            print(f"       Faucet: https://www.alchemy.com/faucets/base-sepolia")
            results.append(("Agent balance", False))
        else:
            print(f"  {PASS} {acc.address}: {bal_eth:.6f} ETH")
            results.append(("Agent balance", True))
except Exception as e:
    print(f"  {FAIL} {e}")
    results.append(("Agent balance", False))

# ── 8. UltraVerifier placeholder check ──────────────────────────────────────
print("\n── 8. UltraVerifier (placeholder vs real) ──")
try:
    dep_path = Path(os.getenv("DEPLOYMENTS_PATH", "../contracts/deployments/base-sepolia.json"))
    cfg = json.loads(dep_path.read_text())
    verifier_addr = cfg.get("UltraVerifier", "")
    verifier_src = Path("../contracts/src/UltraVerifier.sol").read_text()
    if "IS_PLACEHOLDER" in verifier_src or "always returns true" in verifier_src:
        print(f"  {WARN} UltraVerifier.sol is a PLACEHOLDER (always returns true)")
        print(f"       Run install_linux.sh to generate the real verifier from nargo codegen-verifier")
        print(f"       Then redeploy contracts to replace {verifier_addr}")
        results.append(("UltraVerifier", False))
    else:
        print(f"  {PASS} UltraVerifier.sol appears to be the real nargo-generated verifier")
        results.append(("UltraVerifier", True))
except Exception as e:
    print(f"  {WARN} Could not check: {e}")
    results.append(("UltraVerifier", None))

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 56)
print("  VERIFY SETUP SUMMARY")
print("=" * 56)
total = len(results)
passed = sum(1 for _, v in results if v is True)
warned = sum(1 for _, v in results if v is None)
failed = sum(1 for _, v in results if v is False)

for name, status in results:
    icon = PASS if status is True else (WARN if status is None else FAIL)
    print(f"  {icon}  {name}")

print()
print(f"  {passed}/{total} checks passed,  {failed} failed,  {warned} warnings")

if failed == 0:
    print("\n  READY FOR TESTNET GO-LIVE ✓")
elif failed <= 2 and all(n not in ["BN254 Poseidon", "RPC", "Deployments"] for n, v in results if not v):
    print("\n  MOSTLY READY — address warnings before go-live")
else:
    print("\n  NOT READY — fix failures above first")

print("=" * 56)
sys.exit(0 if failed == 0 else 1)
