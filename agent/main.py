"""
main.py — Provium autonomous compliance agent entry point.

Usage:
  python main.py             # live mode, runs every 60 seconds
  python main.py --dry-run   # single epoch, no on-chain writes (chain reads still work)
  python main.py --once      # single epoch then exit
  python main.py --interval 300   # run every 5 minutes

Logs: ./logs/agent_YYYYMMDD.log + stdout
"""

import asyncio
import sys
import os
import time
import json
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Filter annoying Pydantic 2.0 warnings from Agno
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

# ── Validate env before importing agent code ──────────────────────────────────
REQUIRED: list[tuple[str, str]] = [
    ("GROQ_API_KEY",         "Groq LLM API key — get free at console.groq.com"),
    ("AGENT_PRIVATE_KEY",    "Agent wallet private key (needs Base Sepolia ETH for gas)"),
    ("BASE_SEPOLIA_RPC",     "RPC URL — default: https://sepolia.base.org"),
    ("DEPLOYMENTS_PATH",     "Path to base-sepolia.json — e.g. ../contracts/deployments/base-sepolia.json"),
]

def check_env(dry_run: bool) -> bool:
    ok = True
    for key, hint in REQUIRED:
        val = os.getenv(key, "")
        if not val or val.endswith("..."):
            if dry_run and key == "AGENT_PRIVATE_KEY":
                continue  # don't need key for dry run
            print(f"  [X] Missing: {key}")
            print(f"      → {hint}")
            ok = False
        else:
            masked = val[:6] + "..." + val[-4:] if len(val) > 12 else "****"
            print(f"  [OK] {key} = {masked}")
    return ok


def check_deployments() -> bool:
    path = Path(os.getenv("DEPLOYMENTS_PATH", "../contracts/deployments/base-sepolia.json"))
    if not path.exists():
        print(f"  [X] Deployments file not found: {path}")
        print("      → Run: cd contracts && npx hardhat run scripts/deploy.ts --network baseSepolia")
        return False
    try:
        cfg = json.loads(path.read_text())
        required_keys = ["LendingProtocol", "RegulatorPortal", "ComplianceRegistry", "UltraVerifier"]
        for k in required_keys:
            addr = cfg.get(k, "")
            if not addr or addr == "0x0000000000000000000000000000000000000000":
                print(f"  [X] Missing address in deployments: {k}")
                return False
            print(f"  [OK] {k} = {addr[:10]}...")
        return True
    except Exception as e:
        print(f"  [X] Could not parse deployments: {e}")
        return False


def check_nargo() -> bool:
    import subprocess
    result = subprocess.run(["nargo", "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        print("  [X] nargo not found - install Noir: https://noir-lang.org/docs/getting_started/installation/")
        return False
    print(f"  [OK] nargo {result.stdout.strip()}")
    return True


def check_poseidon_hash() -> bool:
    """Verify BN254 Poseidon is installed and produces field-valid outputs."""
    try:
        from tools.proof_tools import _poseidon_bn254, BN254_PRIME
        h = _poseidon_bn254(0, 0)
        assert 0 <= h < BN254_PRIME, f"Output out of field: {h}"
        h2 = _poseidon_bn254(10**18, 12000 * 10**6)
        assert 0 <= h2 < BN254_PRIME
        print(f"  [OK] BN254 Poseidon working (hash(0,0)={str(h)[:20]}...)")
        return True
    except RuntimeError as e:
        print(f"  [X] poseidon-hash not installed: {e}")
        print("      → pip install poseidon-hash>=1.1.0")
        return False
    except Exception as e:
        print(f"  [X] BN254 Poseidon check failed: {e}")
        return False



    """Verify we can reach the RPC and contracts."""
    try:
        from web3 import Web3
        rpc = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
        w3 = Web3(Web3.HTTPProvider(rpc))
        if not w3.is_connected():
            print("  [X] RPC not reachable - check BASE_SEPOLIA_RPC")
            return False
        block = w3.eth.block_number
        print(f"  [OK] RPC connected (block #{block})")
        return True
    except Exception as e:
        print(f"  [X] RPC check failed: {e}")
        return False


# ── Logging setup ─────────────────────────────────────────────────────────────

def setup_logging():
    Path("logs").mkdir(exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    log_file = f"logs/agent_{today}.log"

    fmt = "[%(asctime)s] %(levelname)-8s %(name)s  %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=fmt,
        datefmt="%H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )
    return log_file


# ── Epoch runner ──────────────────────────────────────────────────────────────

def run_epoch(dry_run: bool) -> dict:
    if dry_run:
        # In dry-run: only read from chain, no writes
        os.environ["ZKCOMPLY_DRY_RUN"] = "1"
    else:
        os.environ.pop("ZKCOMPLY_DRY_RUN", None)

    from orchestrator import run_epoch as _run_epoch
    return _run_epoch()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Provium autonomous compliance agent")
    parser.add_argument("--dry-run",  action="store_true", help="Read chain only, no on-chain writes")
    parser.add_argument("--once",     action="store_true", help="Run one epoch then exit")
    parser.add_argument("--interval", type=int, default=60, help="Seconds between epochs (default: 60)")
    parser.add_argument("--skip-checks", action="store_true", help="Skip pre-flight checks")
    args = parser.parse_args()

    log_file = setup_logging()
    logger = logging.getLogger("zkcomply.main")

    print()
    print("+==================================================+")
    print("|          Provium Autonomous Compliance           |")
    print("|   Groq . Agno . Noir . Base Sepolia             |")
    print("+==================================================+")
    print(f"  Mode:     {'DRY RUN (read-only)' if args.dry_run else 'LIVE (writes on-chain)'}")
    print(f"  Interval: {args.interval}s")
    print(f"  Log file: {log_file}")
    print()

    # Pre-flight checks
    if not args.skip_checks:
        print("── Pre-flight checks ──────────────────────────────")
        env_ok     = check_env(args.dry_run)
        deps_ok    = check_deployments()
        poseidon_ok = check_poseidon_hash()
        nargo_ok   = check_nargo()
        rpc_ok     = check_rpc_connectivity()
        print()

        # On Windows: nargo failing is expected — warn but don't block dry-run
        if sys.platform == "win32" and not nargo_ok:
            print("  [!] nargo not available on Windows — ZK proofs require Linux.")
            print("      Dry-run mode works without nargo (no on-chain writes).")
            if not args.dry_run:
                print("  [X] Cannot run live mode without nargo. Use --dry-run on Windows.")
                sys.exit(1)
            nargo_ok = True  # allow dry-run to proceed

        if not (env_ok and deps_ok and poseidon_ok and nargo_ok and rpc_ok):
            print("[X] Pre-flight checks failed. Fix the above issues, then re-run.")
            print("  Use --skip-checks to bypass (not recommended).")
            sys.exit(1)

        print("[OK] All checks passed. Starting agent...\n")

    logger.info("Provium agent starting")
    logger.info(f"Mode: {'dry-run' if args.dry_run else 'live'}")
    logger.info(f"Interval: {args.interval}s")

    epoch_num = 0
    while True:
        epoch_num += 1
        logger.info(f"Starting epoch #{epoch_num}")

        try:
            result = run_epoch(args.dry_run)
            actions_done = len(result.get("actions", []))
            skipped = result.get("skipped", False)
            elapsed = result.get("elapsed_seconds", 0)

            if skipped:
                dry_count = result.get("dry_run_actions_count")
                msg = f"Epoch #{epoch_num} skipped"
                if dry_count:
                    msg += f" (dry run: {dry_count} actions would run) [{elapsed}s]"
                else:
                    msg += f" (no action needed) [{elapsed}s]"
                logger.info(msg)
            else:
                successes = sum(1 for a in result.get("actions", []) if a.get("success"))
                logger.info(f"Epoch #{epoch_num} complete: {successes}/{actions_done} actions succeeded [{elapsed}s]")

        except KeyboardInterrupt:
            logger.info("Agent stopped by user.")
            sys.exit(0)
        except Exception as e:
            logger.error(f"Epoch #{epoch_num} failed: {e}", exc_info=True)

        if args.once:
            logger.info("--once flag set. Exiting.")
            break

        logger.info(f"Next epoch in {args.interval}s. Ctrl+C to stop.")
        try:
            time.sleep(args.interval)
        except KeyboardInterrupt:
            logger.info("Agent stopped by user.")
            sys.exit(0)


if __name__ == "__main__":
    main()
