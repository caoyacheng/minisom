#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
export PYTHONPATH="$DIR"
export SOM_API_BASE="${SOM_API_BASE:-http://127.0.0.1:8000}"
exec "$DIR/.venv/bin/python" -m som_mcp "$@"
