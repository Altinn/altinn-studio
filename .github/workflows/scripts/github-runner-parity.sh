#!/usr/bin/env bash
set -euo pipefail

section() {
  printf '\n## %s\n' "$1"
}

phase="${1:-diagnostics}"

run_optional() {
  printf '\n$ %s\n' "$*"
  "$@" || true
}

tool_version() {
  local tool="$1"
  printf '\n### %s\n' "${tool}"
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "not found"
    return
  fi

  command -v "${tool}"
  case "${tool}" in
    go)
      "${tool}" version 2>&1 || true
      ;;
    dotnet)
      "${tool}" --info 2>&1 | head -n 30 || true
      ;;
    node)
      "${tool}" --version 2>&1 || true
      ;;
    yarn)
      "${tool}" --version 2>&1 || true
      ;;
    *)
      "${tool}" --version 2>&1 | head -n 5 || true
      ;;
  esac
}

benchmark_small_files() {
  local base="$1"
  if [[ ! -d "${base}" || ! -w "${base}" ]]; then
    printf '\n### %s\nnot writable or not found\n' "${base}"
    return
  fi

  local dir start end elapsed
  dir="$(mktemp -d "${base%/}/parity-small-files.XXXXXX")"
  start="$(date +%s%N)"
  for i in $(seq 1 1000); do
    printf 'file %s\n' "${i}" >"${dir}/file-${i}.txt"
  done
  sync "${dir}" 2>/dev/null || true
  end="$(date +%s%N)"
  elapsed="$(((end - start) / 1000000))"
  rm -rf "${dir}"

  printf '\n### %s\n1000 small files: %sms\n' "${base}" "${elapsed}"
}

section "Phase"
echo "${phase}"

section "Identity"
run_optional uname -a
run_optional id
run_optional pwd

section "Environment"
env | sort

section "Tool Versions"
for tool in bash git make gcc g++ pkg-config go dotnet node yarn docker jq curl unzip tar; do
  tool_version "${tool}"
done

section "Go Environment"
run_optional go env CGO_ENABLED CC CXX GOCACHE GOMODCACHE GOROOT GOPATH GOTOOLCHAIN GOOS GOARCH

section "Cache Directories"
for path in \
  "${HOME}/.cache" \
  "${HOME}/.cache/go-build" \
  "${HOME}/.cache/yarn" \
  "${HOME}/.npm" \
  "${HOME}/.nuget/packages" \
  "${HOME}/go/pkg/mod" \
  "${HOME}/_work/_tool" \
  "/opt/tools" \
  "/usr/share/dotnet" \
  "${RUNNER_TOOL_CACHE:-${RUNNER_WORKSPACE:-${HOME}/_work}/_tool}"; do
  printf '\n### %s\n' "${path}"
  run_optional stat "${path}"
done

section "Small File Write Benchmark"
benchmark_small_files "${RUNNER_TEMP:-${HOME}/_work/_temp}"
benchmark_small_files "${TMPDIR:-/tmp}"
benchmark_small_files "${GITHUB_WORKSPACE:-$(pwd)}"

section "Disk"
run_optional df -h
run_optional df -PT / "${HOME}/_work" /var/lib/docker /tmp

section "Mounts"
run_optional mount

section "Docker"
run_optional docker info
run_optional docker compose version
