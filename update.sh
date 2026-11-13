#!/usr/bin/env bash
# Refresh source caches, then rebuild the index into ./dist (atomic swap).
# Usage: SITE_URL=https://skills.example.com ./update.sh
set -euo pipefail
cd "$(dirname "$0")"
SRC="${SRC_DIR:-../skillrosa-src}"
OUT="${OUT_DIR:-dist}"

python3 -I scripts/sync.py --src "$SRC"
# Build into a temp dir first so nginx never serves a half-written site.
python3 -I scripts/build.py --src "$SRC" --out "$OUT.new"
rm -rf "$OUT.old"
[ -d "$OUT" ] && mv "$OUT" "$OUT.old"
mv "$OUT.new" "$OUT"
rm -rf "$OUT.old"
