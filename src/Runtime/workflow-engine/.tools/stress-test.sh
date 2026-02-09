#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD_FILE="$SCRIPT_DIR/process-next-payload.json"

BASE_URL="http://localhost:8080/api/v1/workflow/test-org/test-app/12345"
HEALTH_URL="http://localhost:8080/api/v1/health"
API_KEY="0544ba8b-2d8a-4ec9-b93a-47cdbd220293"
POLL_INTERVAL=0.5

N="${1:?Usage: $0 <number-of-requests> [max-concurrency]}"
MAX_CONCURRENT="${2:-0}" # 0 = unlimited

PAYLOAD=$(jq -c . "$PAYLOAD_FILE")

RESULT_DIR=$(mktemp -d)
trap 'rm -rf "$RESULT_DIR"' EXIT

# Millisecond-precision timestamp (macOS compatible)
now_ms() {
    perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000'
}

# Format milliseconds as "X.XXXs (Yms)"
fmt_ms() {
    local ms=$1
    local s=$((ms / 1000))
    local frac=$((ms % 1000))
    printf '%d.%03ds (%dms)' "$s" "$frac" "$ms"
}

# --- Header ---
echo "=== Workflow Engine Stress Test ==="
echo "Requests:    $N"
if [[ "$MAX_CONCURRENT" -gt 0 ]]; then
    echo "Concurrency: $MAX_CONCURRENT"
else
    echo "Concurrency: unlimited"
fi
echo "Target:      $BASE_URL/<guid>/next"
echo ""

# --- Phase 1: Submit all requests as fast as possible ---
echo "Phase 1: Submitting $N requests..."
START_MS=$(now_ms)

for i in $(seq 1 "$N"); do
    GUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
    URL="${BASE_URL}/${GUID}/next"
    (
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            -H 'Content-Type: application/json' \
            -H "X-Api-Key: $API_KEY" \
            -d "$PAYLOAD" \
            "$URL")
        echo "$STATUS" > "$RESULT_DIR/$i"
    ) &

    # Throttle if concurrency limit is set (batch-style: pause every N jobs)
    if [[ "$MAX_CONCURRENT" -gt 0 ]] && (( i % MAX_CONCURRENT == 0 )); then
        wait
    fi
done

echo "  All requests dispatched, waiting for HTTP responses..."
wait

SUBMIT_MS=$(now_ms)
SUBMIT_DURATION=$((SUBMIT_MS - START_MS))

# Tally results
ACCEPTED=$(grep -rl '^200$' "$RESULT_DIR" 2>/dev/null | wc -l | tr -d ' ')
REJECTED=$((N - ACCEPTED))

echo "  Done. Submitted in $(fmt_ms $SUBMIT_DURATION) (accepted: $ACCEPTED, rejected: $REJECTED)"
echo ""

# --- Phase 2: Poll until queue is drained ---
echo "Phase 2: Waiting for queue to drain..."

while true; do
    QUEUE_COUNT=$(curl -s "$HEALTH_URL" \
        | jq -r '.checks[] | select(.name == "Engine") | .data.queue // empty')

    if [[ -z "$QUEUE_COUNT" ]]; then
        echo "  Warning: could not read queue count from $HEALTH_URL"
        sleep "$POLL_INTERVAL"
        continue
    fi

    if [[ "$QUEUE_COUNT" -eq 0 ]]; then
        echo "  Queue is empty."
        break
    fi

    echo "  Queue: $QUEUE_COUNT"
    sleep "$POLL_INTERVAL"
done

END_MS=$(now_ms)
TOTAL_DURATION=$((END_MS - START_MS))

# --- Results ---
echo ""
echo "=== Results ==="
echo "  Requests submitted:  $N"
echo "  Accepted:            $ACCEPTED"
echo "  Rejected:            $REJECTED"
echo "  Submit time:         $(fmt_ms $SUBMIT_DURATION)"
echo "  Total time:          $(fmt_ms $TOTAL_DURATION)"

if command -v bc &>/dev/null && [[ "$TOTAL_DURATION" -gt 0 ]]; then
    THROUGHPUT=$(echo "scale=2; $ACCEPTED / ($TOTAL_DURATION / 1000)" | bc)
    echo "  Throughput:          ${THROUGHPUT} accepted req/s"
fi
