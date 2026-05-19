#!/usr/bin/env bash
# Extract base64-encoded files from a /generate response.
# Usage:
#   ./examples/extract-files.sh response.json              # writes into current dir
#   ./examples/extract-files.sh response.json out          # writes into ./out/
set -euo pipefail

RESPONSE_PATH="${1:?usage: $0 <response.json> [out-dir]}"
OUT_DIR="${2:-.}"

mkdir -p "$OUT_DIR"

jq -r '.pdfs[] | "\(.name)\t\(.data)"' "$RESPONSE_PATH" \
  | while IFS=$'\t' read -r name data; do
      target="$OUT_DIR/$name"
      echo "$data" | base64 -d > "$target"
      printf '%12d bytes  →  %s\n' "$(wc -c <"$target")" "$target"
    done
