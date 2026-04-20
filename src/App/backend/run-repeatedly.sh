#!/bin/bash

set -Eeuo pipefail
IFS=$'\n\t'

TEST_FILTER="${TEST_FILTER:-}"
MAX_RUNS="${MAX_RUNS:-10}"

echo "Running integration tests repeatedly with:"
echo "  TEST_FILTER=$TEST_FILTER"
echo "  MAX_RUNS=$MAX_RUNS"
echo

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

dotnet build test/Altinn.App.Integration.Tests/

for i in $(seq 1 $MAX_RUNS); do
    echo "========================================"
    echo "Starting test run $i of $MAX_RUNS"
    echo "========================================"

    DOTNET_TEST_ARGS_ARRAY=("--no-restore" "--no-build" "test/Altinn.App.Integration.Tests/" "--logger" "console;verbosity=detailed")
    if [ -n "$TEST_FILTER" ]; then
        DOTNET_TEST_ARGS_ARRAY+=("--filter" "$TEST_FILTER")
    fi
    
    if dotnet test "${DOTNET_TEST_ARGS_ARRAY[@]}"; then
        echo "✓ Test run $i completed successfully"

        if ! check_snapshot_diffs $i; then
            echo "studioctl cleanup is managed by the test fixture; check test output and generated logs for debugging."
            exit 1
        fi

        echo "Test run $i completed without snapshot differences"
        echo
    else
        echo "❌ FAILURE: Test run $i failed!"
        echo "studioctl cleanup is managed by the test fixture; check test output and generated logs for debugging."
        exit 1
    fi
done

echo "========================================"
echo "✅ SUCCESS: All $MAX_RUNS runs completed successfully with consistent snapshots!"
echo "========================================"
