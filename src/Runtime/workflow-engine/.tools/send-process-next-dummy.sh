#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD_FILE="$SCRIPT_DIR/process-next-payload.json"

URL="http://localhost:8080/api/v1/workflow/test-org/test-app/12345/f13f515d-17b2-4f86-9c7a-a955583c4a1c/next"
INTERVAL=2
COUNT=0

PAYLOAD=$(jq -c . "$PAYLOAD_FILE")

cleanup() {
    echo -e "\nStopped after $COUNT requests."
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "Sending POST requests to $URL every ${INTERVAL}s (Ctrl+C to stop)"

while true; do
    COUNT=$((COUNT + 1))
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H 'Content-Type: application/json' \
        -H 'X-Api-Key: 0544ba8b-2d8a-4ec9-b93a-47cdbd220293' \
        -d "$PAYLOAD" \
        "$URL")
    echo "#$COUNT - HTTP $STATUS"
    sleep "$INTERVAL"
done
