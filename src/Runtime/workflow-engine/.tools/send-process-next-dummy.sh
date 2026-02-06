#!/usr/bin/env bash
set -euo pipefail

URL="http://localhost:8080/api/v1/workflow/test-org/test-app/12345/f13f515d-17b2-4f86-9c7a-a955583c4a1c/next"
INTERVAL=2
COUNT=0

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
        -d '{
            "currentElementId": "Task_1",
            "desiredElementId": "Task_2",
            "actor": {
                "userIdOrOrgNumber": "1337",
                "language": "nb"
            },
            "steps": [
                { "command": { "type": "app", "commandKey": "ProcessTaskEnd" } },
                { "command": { "type": "app", "commandKey": "CommonTaskFinalization" } },
                { "command": { "type": "app", "commandKey": "EndTaskLegacyHook" } },
                { "command": { "type": "app", "commandKey": "OnTaskEndingHook" } },
                { "command": { "type": "app", "commandKey": "LockTaskData" } },
                { "command": { "type": "app", "commandKey": "UpdateInstanceProcessState" } },
                { "command": { "type": "app", "commandKey": "UnlockTaskData" } },
                { "command": { "type": "app", "commandKey": "StartTaskLegacyHook" } },
                { "command": { "type": "app", "commandKey": "OnTaskStartingHook" } },
                { "command": { "type": "app", "commandKey": "ProcessTaskStart" } },
                { "command": { "type": "app", "commandKey": "MovedToAltinnEvent" } }
            ]
        }' \
        "$URL")
    echo "#$COUNT - HTTP $STATUS"
    sleep "$INTERVAL"
done
