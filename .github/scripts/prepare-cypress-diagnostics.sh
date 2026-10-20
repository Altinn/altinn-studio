#!/usr/bin/env bash
set -euo pipefail

diagnostics_dir="${1:?Usage: prepare-cypress-diagnostics.sh <output-directory>}"
mkdir -p "${diagnostics_dir}"

# Install the temporary debugger in this job when it is unavailable.
if ! command -v gdb >/dev/null; then
  sudo -n apt-get update -qq
  sudo -n apt-get install -y --no-install-recommends gdb
fi

# Check privileged ptrace before spending CI time on tests. Chrome sandbox
# processes are non-dumpable, so a same-user debugger may not be sufficient.
sleep 30 &
probe_pid="$!"
trap 'kill "${probe_pid}" 2>/dev/null || true; wait "${probe_pid}" 2>/dev/null || true' EXIT

# Keep the output file owned by the job user, rather than the debugger.
# shellcheck disable=SC2024
sudo -n timeout --kill-after=2s 10s gdb --batch --nx --nh \
  -iex 'set auto-load off' \
  -iex 'set debuginfod enabled off' \
  -p "${probe_pid}" \
  -ex "python assert gdb.selected_inferior().pid == ${probe_pid}" \
  -ex 'thread apply all bt 1' \
  -ex 'detach' >"${diagnostics_dir}/gdb-preflight.log" 2>&1

echo 'Cypress diagnostics: privileged native stack capture is available.'
