#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but was not found in PATH."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Installing dependencies..."
  npm install
else
  if ! npm ls --depth=0 >/dev/null 2>&1; then
    echo "Dependencies look incomplete. Re-installing dependencies..."
    npm install
  fi
fi

echo "Starting gridcolorgame..."
exec npm run dev -- "$@"
