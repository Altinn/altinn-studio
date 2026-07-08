#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
FRONTEND="$REPO_ROOT/src/App/frontend"
DEST="$SCRIPT_DIR/Embedded"

(cd "$FRONTEND" && corepack yarn install --immutable && corepack yarn gen)

FILES=(
  application/application-metadata.schema.v1.json
  layout/expression.schema.v1.json
  layout/layout.schema.v1.json
  layout/layoutSettings.schema.v1.json
  layout/footer.schema.v1.json
  text-resources/text-resources.schema.v1.json
)
for f in "${FILES[@]}"; do
  mkdir -p "$DEST/$(dirname "$f")"
  cp "$FRONTEND/schemas/json/$f" "$DEST/$f"
done

echo "Synced ${#FILES[@]} schemas into $DEST."
echo "Review the diff, then run: dotnet test $REPO_ROOT/src/libs/dotnet/libs.slnx"
