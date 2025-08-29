#!/bin/bash

set -Eeuo pipefail
IFS=$'\n\t'

# Configuration
TEST_LOCALTEST_BRANCH="${TEST_LOCALTEST_BRANCH:-main}"
TEST_KEEP_CONTAINERS="${TEST_KEEP_CONTAINERS:-true}"
TEST_FILTER="${TEST_FILTER:-}"
MAX_RUNS="${MAX_RUNS:-10}"

# Detect container runtime (docker or podman)
if command -v docker >/dev/null 2>&1; then
    CONTAINER_RUNTIME="docker"
elif command -v podman >/dev/null 2>&1; then
    CONTAINER_RUNTIME="podman"
else
    echo "❌ ERROR: Neither docker nor podman was found, something is wrong"
    exit 1
fi

echo "Running integration tests repeatedly with:"
echo "  TEST_LOCALTEST_BRANCH=$TEST_LOCALTEST_BRANCH"
echo "  TEST_KEEP_CONTAINERS=$TEST_KEEP_CONTAINERS"
echo "  TEST_FILTER=$TEST_FILTER"
echo "  MAX_RUNS=$MAX_RUNS"
echo "  CONTAINER_RUNTIME=$CONTAINER_RUNTIME"
echo

# Function to check for snapshot diffs
check_snapshot_diffs() {
    local run_number=$1

    echo "Checking for snapshot changes after run $run_number..."

    # Get git diff for snapshot files
    if git diff --name-only | grep -q "_snapshots/"; then
        echo "❌ FAILURE: Snapshot files have changed after run $run_number!"
        echo "Changed snapshot files:"
        git diff --name-only | grep "_snapshots/" || true
        echo
        echo "Git diff summary:"
        git diff --stat | grep "_snapshots/" || true
        return 1
    else
        echo "✓ No snapshot changes detected after run $run_number"
        return 0
    fi
}

# Function to cleanup containers after successful run
cleanup_containers() {
    local run_number=$1

    echo "Cleaning up containers after successful run $run_number..."

    # Collect running containers with applib prefix
    local running_containers=()
    while IFS= read -r container_id; do
        [[ -n "$container_id" ]] && running_containers+=("$container_id")
    done < <($CONTAINER_RUNTIME ps -q --filter "name=^applib")

    if [ ${#running_containers[@]} -gt 0 ]; then
        echo "Stopping ${#running_containers[@]} running applib containers..."
        "$CONTAINER_RUNTIME" stop "${running_containers[@]}" || true
    fi

    # Collect all containers (running and stopped) with applib prefix
    local all_containers=()
    while IFS= read -r container_id; do
        [[ -n "$container_id" ]] && all_containers+=("$container_id")
    done < <($CONTAINER_RUNTIME ps -a -q --filter "name=^applib")

    if [ ${#all_containers[@]} -gt 0 ]; then
        echo "Removing ${#all_containers[@]} applib containers..."
        "$CONTAINER_RUNTIME" rm "${all_containers[@]}" || true
    fi

    echo "✓ Container cleanup completed"
}

dotnet build test/Altinn.App.Integration.Tests/

# Main loop
for i in $(seq 1 $MAX_RUNS); do
    echo "========================================"
    echo "Starting test run $i of $MAX_RUNS"
    echo "========================================"

    # Run the integration tests
    DOTNET_TEST_ARGS_ARRAY=("--no-restore" "--no-build" "test/Altinn.App.Integration.Tests/" "--logger" "console;verbosity=detailed")
    if [ -n "$TEST_FILTER" ]; then
        DOTNET_TEST_ARGS_ARRAY+=("--filter" "$TEST_FILTER")
    fi
    
    if env TEST_LOCALTEST_BRANCH="$TEST_LOCALTEST_BRANCH" TEST_KEEP_CONTAINERS="$TEST_KEEP_CONTAINERS" dotnet test "${DOTNET_TEST_ARGS_ARRAY[@]}"; then
        echo "✓ Test run $i completed successfully"

        # Check for snapshot differences
        if ! check_snapshot_diffs $i; then
            echo "Containers are still running for debugging."
            exit 1
        fi

        # Clean up containers after successful run
        cleanup_containers $i

        echo "Test run $i completed without snapshot differences"
        echo
    else
        echo "❌ FAILURE: Test run $i failed!"
        echo "Containers are still running for debugging."
        exit 1
    fi
done

echo "========================================"
echo "✅ SUCCESS: All $MAX_RUNS runs completed successfully with consistent snapshots!"
echo "========================================"
