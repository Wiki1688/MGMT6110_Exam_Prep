#!/usr/bin/env bash
# Copies the real revision content into the app's public folder.
# Usage: bash scripts/sync-content.sh [SOURCE_DIR]
set -e
SRC="${1:-/home/claude/mgmt6110/build/content}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$DIR/public/content"
if [ ! -d "$SRC" ]; then
  echo "Source folder not found: $SRC" >&2
  exit 1
fi
mkdir -p "$DEST"
cp -r "$SRC"/. "$DEST"/
rm -f "$DEST/questions.json"  # quiz bank belongs to the quiz app
# make sure the optional extra-file index exists
[ -f "$DEST/index.json" ] || echo '[]' > "$DEST/index.json"
mkdir -p "$DEST/extra"
echo "Copied $SRC -> $DEST"
ls -la "$DEST"
