#!/usr/bin/env bash
#
# Exports a Grafana dashboard from the running LGTM container and saves it
# to the .docker/dashboards/ directory, ready for provisioning.
#
# Usage:
#   ./export-dashboard.sh <dashboard-uid> <filename>
#
# Example:
#   ./export-dashboard.sh gsvdb8 workflow-engine.json
#
# To find dashboard UIDs, list all dashboards:
#   docker exec workflow-engine-lgtm curl -s 'http://localhost:3000/api/search?type=dash-db'
#
# Note: Only dashboards you've created need exporting. The built-in LGTM
# dashboards (RED Metrics, JVM Overview) are provided by the image itself.

set -euo pipefail

if [ $# -ne 2 ]; then
    echo "Usage: $0 <dashboard-uid> <filename>"
    echo "Example: $0 gsvdb8 workflow-engine.json"
    exit 1
fi

DASHBOARD_UID="$1"
FILENAME="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_PATH="${SCRIPT_DIR}/dashboards/${FILENAME}"

mkdir -p "${SCRIPT_DIR}/dashboards"

docker exec workflow-engine-lgtm \
    curl -sf "http://localhost:3000/api/dashboards/uid/${DASHBOARD_UID}" \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
dashboard = data['dashboard']
dashboard.pop('id', None)
dashboard.pop('version', None)
print(json.dumps(dashboard, indent=2))
" > "${OUTPUT_PATH}"

echo "Exported dashboard '${DASHBOARD_UID}' to ${OUTPUT_PATH}"
