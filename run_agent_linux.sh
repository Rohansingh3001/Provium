#!/usr/bin/env bash
# ============================================================
# run_agent_linux.sh  —  Start the Provium compliance agent on Linux
# Run from the repo root: bash run_agent_linux.sh
# ============================================================
set -e

# Add nargo to PATH (noirup default location)
export PATH="$HOME/.nargo/bin:$PATH"

# Validate nargo installed
if ! command -v nargo >/dev/null 2>&1; then
    echo "[X] nargo not found. Run: bash install_linux.sh"
    exit 1
fi

# Validate .env exists
if [ ! -f agent/.env ]; then
    echo "[X] agent/.env not found. Copy agent/.env.example and fill in secrets."
    exit 1
fi

cd agent

# Step 1: Verify setup
echo ""
echo "── Pre-flight checks ────────────────────────────────────"
python3 verify_setup.py || {
    echo ""
    echo "[!] Some checks failed. Fix above issues before running live."
    echo "    To override: cd agent && python3 main.py --skip-checks"
    exit 1
}

echo ""
echo "── Starting Provium agent ───────────────────────────────"
echo "    Mode:     LIVE (real txns on Base Sepolia)"
echo "    Interval: 60 seconds"
echo "    Logs:     agent/logs/agent_YYYYMMDD.log"
echo ""
echo "    Ctrl+C to stop."
echo ""

# Run the agent — one epoch at a time or continuous loop
if [ "$1" = "--once" ]; then
    python3 main.py --once
elif [ "$1" = "--dry-run" ]; then
    python3 main.py --dry-run --once
else
    python3 main.py
fi
