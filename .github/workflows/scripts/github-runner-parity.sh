#!/usr/bin/env bash
set -euo pipefail

section() {
  printf '\n## %s\n' "$1"
}

run_optional() {
  printf '\n$ %s\n' "$*"
  "$@" || true
}

section "Identity"
run_optional uname -a
run_optional id
run_optional pwd

section "Environment"
env | sort

section "Tool Versions"
for tool in bash git make gcc g++ pkg-config go dotnet node yarn docker jq curl unzip tar; do
  printf '\n### %s\n' "${tool}"
  if command -v "${tool}" >/dev/null 2>&1; then
    command -v "${tool}"
    "${tool}" --version 2>&1 | head -n 5 || true
  else
    echo "not found"
  fi
done

section "Go Environment"
run_optional go env CGO_ENABLED CC CXX GOCACHE GOMODCACHE GOROOT GOPATH GOTOOLCHAIN GOOS GOARCH

section "Cache Directories"
for path in \
  "${HOME}/.cache" \
  "${HOME}/.cache/go-build" \
  "${HOME}/.cache/yarn" \
  "${HOME}/.nuget/packages" \
  "${HOME}/go/pkg/mod" \
  "${HOME}/_work/_tool" \
  "${RUNNER_TOOL_CACHE:-${RUNNER_WORKSPACE:-${HOME}/_work}/_tool}"; do
  printf '\n### %s\n' "${path}"
  run_optional stat "${path}"
done

section "Disk"
run_optional df -h

section "Mounts"
run_optional mount
