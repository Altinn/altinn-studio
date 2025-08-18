#!/bin/bash

set -e

# Configuration
TEST_LOCALTEST_BRANCH="${TEST_LOCALTEST_BRANCH:-main}"
TEST_KEEP_CONTAINERS="${TEST_KEEP_CONTAINERS:-true}"
MAX_RUNS="${MAX_RUNS:-10}"

echo "Running integration tests repeatedly with:"
echo "  TEST_LOCALTEST_BRANCH=$TEST_LOCALTEST_BRANCH"
echo "  TEST_KEEP_CONTAINERS=$TEST_KEEP_CONTAINERS"
echo "  MAX_RUNS=$MAX_RUNS"
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

    # Stop and remove all containers
    if [ "$(docker ps -q | wc -l)" -gt 0 ]; then
        echo "Stopping running containers..."
        docker stop $(docker ps -q) || true
    fi

    if [ "$(docker ps -a -q | wc -l)" -gt 0 ]; then
        echo "Removing stopped containers..."
        docker rm $(docker ps -a -q) || true
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
    if TEST_LOCALTEST_BRANCH="$TEST_LOCALTEST_BRANCH" TEST_KEEP_CONTAINERS="$TEST_KEEP_CONTAINERS" dotnet test --no-restore --no-build test/Altinn.App.Integration.Tests/ --logger "console;verbosity=detailed"; then
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
