#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  echo "Creating .venv (requires Python 3.12)..."
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

export PYTHONPATH="$ROOT"
exec .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
