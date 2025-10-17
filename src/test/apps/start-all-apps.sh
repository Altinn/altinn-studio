#!/bin/bash

# Script to start all test apps on dynamic ports
# Apps will automatically register with localtest in auto mode
#
# Usage:
#   ./start-all-apps.sh           # Minimal logging (warnings/errors only)
#   ./start-all-apps.sh --verbose # Full logging (all messages)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

YELLOW='\033[1;33m'
NC='\033[0m' # No Color
declare -a PIDS=()

# Check for verbose flag
VERBOSE=false
if [[ "$1" == "--verbose" ]] || [[ "$1" == "-v" ]]; then
    VERBOSE=true
fi

cleanup() {
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

APP_DIRS=$(find "$SCRIPT_DIR" -maxdepth 2 -type d -name "App" ! -path "*/bin/*" ! -path "*/obj/*" | sort)
for app_dir in $APP_DIRS; do
    app_name=$(basename "$(dirname "$app_dir")")

    # Start the app
    # Use ASPNETCORE_ENVIRONMENT=Development to use appsettings.Development.json
    # --no-launch-profile prevents launchSettings.json from overriding our configuration
    (
        cd "$app_dir"
        if [ "$VERBOSE" = true ]; then
            # Verbose mode: show all logs
            ASPNETCORE_ENVIRONMENT=Development \
            dotnet run --no-build --no-launch-profile 2>&1 | sed --unbuffered "s/^/[$app_name] /"
        else
            # Minimal logging: only warnings and errors
            ASPNETCORE_ENVIRONMENT=Development \
            Logging__LogLevel__Default=Warning \
            Logging__LogLevel__Microsoft=Warning \
            Logging__LogLevel__System=Warning \
            Logging__LogLevel__Microsoft__Hosting__Lifetime=Information \
            dotnet run --no-build --no-launch-profile 2>&1 | sed --unbuffered "s/^/[$app_name] /"
        fi
    ) &

    PIDS+=($!)
done

if [ "$VERBOSE" = true ]; then
    echo -e "${YELLOW}Running in verbose mode. Press Ctrl+C to stop all apps${NC}"
else
    echo -e "${YELLOW}Running in minimal logging mode. Use --verbose for full logs. Press Ctrl+C to stop all apps${NC}"
fi
wait
