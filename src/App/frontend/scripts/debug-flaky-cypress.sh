#!/bin/bash

# Script to run specified Cypress test a certain number of times (defaults to 50) or until failure.
# Writes logs to the $logs_folder

spec_arg=${1:-""}  # Optional spec argument- defaults to running all tests if not specified
max_runs=${2:-50}  # Default to 50 if no argument provided
counter=1
logs_folder=scripts/debug-flaky-cypress-logs

# Handle Ctrl+C gracefully
cleanup() {
    echo ""
    echo "Interrupted by user after $((counter-1)) runs"
    # Kill any running cypress processes
    pkill -f "cypress"
    exit 0
}

trap cleanup INT TERM

if [ -n "$spec_arg" ]; then
  echo "Running test up to $max_runs times with spec: $spec_arg"
else
  echo "Running test up to $max_runs times..."
fi

# If logs_folder doesn't exist, create it
mkdir -p $logs_folder;

while [ $counter -le $max_runs ]; do
  echo "=== Run #$counter/$max_runs ==="

  # Run the command and capture output
  if [ -n "$spec_arg" ]; then
    yarn cy:run --spec "$spec_arg" 2>&1 | tee "$logs_folder/run-$counter.log"
  else
    yarn cy:run 2>&1 | tee "$logs_folder/run-$counter.log"
  fi
  exit_code=$?
  echo "Exit code for run #$counter: $exit_code"

  # Check for test failures in the output
  if grep -q "Failing:.*[1-9]" "$logs_folder/run-$counter.log" || \
     grep -q "✖.*failed" "$logs_folder/run-$counter.log" || \
     grep -q "failed (100%)" "$logs_folder/run-$counter.log"; then
    echo ""
    echo "==================================="
    echo "FAILURE DETECTED ON RUN #$counter"
    echo "==================================="
    echo "Test failed after $counter attempts"
    echo "Check $logs_folder/run-$counter.log for details"
    echo ""
    exit 0
  fi

  # Also check exit code as backup
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "==================================="
    echo "FAILURE DETECTED ON RUN #$counter"
    echo "==================================="
    echo "Test failed with exit code $exit_code on the $counter attempt"
    echo "Check $logs_folder/run-$counter.log for details"
    echo ""
    exit 0  # Exit the function, not the script
  fi

  echo "Run #$counter passed"
  counter=$((counter + 1))
done

echo "All $max_runs runs passed!"
return 0
