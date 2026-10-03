#!/usr/bin/env bash
# Copy a mod from the Claude Code dev-mods folder (hot reload) into this repo, then validate and test it.
# Usage: scripts/sync-dev-mod.sh <dev-mods/<session>/<mod> folder> [mod name]
set -euo pipefail
src="${1:?path to the dev-mods mod folder}"
name="${2:-$(basename "$src")}"
dst="$(cd "$(dirname "$0")/.." && pwd)/plugins/$name"
rsync -a --delete --exclude 'types/claude-code' --exclude 'tsconfig.json' --exclude '.claude-plugin/types' "$src/" "$dst/"
claude plugin validate "$dst"
claude plugin test "$dst"
