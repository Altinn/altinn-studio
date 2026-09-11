#!/usr/bin/env bash
set -euo pipefail

old_version="v0.0.1-upgrade-smoke"
target_version="v0.0.2-upgrade-smoke"
smoke_root="$(mktemp -d /tmp/au.XXXXXXXX)"
smoke_target="${smoke_root}/target"
binary_directory="${smoke_target}/debug"
old_archive="${smoke_root}/old.tar.gz"
target_archive="${smoke_root}/target.tar.gz"
export AGENT_HOME="${smoke_root}/home"

cleanup() {
  status=$?
  log="${AGENT_HOME}/agentd.log"
  if [ "${RUNNER_OS:-}" = "Windows" ]; then
    log="$(cygpath -u "${AGENT_HOME}")/agentd.log"
  fi
  if [ "${status}" -ne 0 ] && [ -f "${log}" ]; then
    printf '%s\n' 'agentd.log:' >&2
    cat "${log}" >&2
  fi
  if [ "${RUNNER_OS:-}" = "Windows" ]; then
    # shellcheck disable=SC2016 # PowerShell expands its own environment variables.
    pwsh -NoProfile -Command '
      Get-CimInstance Win32_Process |
        Where-Object { $_.Name -eq "agentd.exe" -and $_.CommandLine -like "*$env:AGENT_HOME*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    ' 2>/dev/null || true
  else
    pkill -f "agentd.*--home ${AGENT_HOME}" 2>/dev/null || true
  fi
  rm -rf -- "${smoke_root}"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "${smoke_root}"
CARGO_TARGET_DIR="${smoke_target}" CARGO_PROFILE_DEV_DEBUG=0 \
  AGENT_VERSION="${old_version}" cargo build --locked -p agent --bins
./agent/package.sh "${old_archive}" "${binary_directory}"
CARGO_TARGET_DIR="${smoke_target}" CARGO_PROFILE_DEV_DEBUG=0 \
  AGENT_VERSION="${target_version}" cargo build --locked -p agent --bins
./agent/package.sh "${target_archive}" "${binary_directory}"
rm -rf -- "${smoke_target}"

if [ "${RUNNER_OS:-}" = "Windows" ]; then
  AGENT_INSTALL_ROOT="$(cygpath -w "${smoke_root}/install")"
  AGENT_INSTALL_DIR="$(cygpath -w "${smoke_root}/bin")"
  AGENT_HOME="$(cygpath -w "${smoke_root}/home")"
  export AGENT_VERSION="${old_version}"
  AGENT_LOCAL_ARCHIVE="$(cygpath -w "${old_archive}")"
  export AGENT_INSTALL_ROOT AGENT_INSTALL_DIR AGENT_HOME AGENT_LOCAL_ARCHIVE
  pwsh -NoProfile -File "$(cygpath -w agent/install.ps1)"
  export AGENT_SMOKE_BIN="${AGENT_INSTALL_DIR}"
  AGENT_LOCAL_ARCHIVE="$(cygpath -w "${target_archive}")"
  export AGENT_LOCAL_ARCHIVE
  export AGENT_TARGET_VERSION="${target_version}"
  unset AGENT_INSTALL_ROOT AGENT_INSTALL_DIR
  # shellcheck disable=SC2016 # PowerShell expands its own environment variables.
  pwsh -NoProfile -Command '
    $agentctl = Join-Path $env:AGENT_SMOKE_BIN "agentctl.cmd"
    & $agentctl --home $env:AGENT_HOME self update --version $env:AGENT_TARGET_VERSION
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $actual = (& $agentctl --version | Out-String).Trim()
    if ($actual -ne "agentctl $env:AGENT_TARGET_VERSION") {
      throw "updated agentctl reports $actual"
    }
    & $agentctl --home $env:AGENT_HOME self update --version $env:AGENT_TARGET_VERSION
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  '
else
  export AGENT_INSTALL_ROOT="${smoke_root}/install"
  export AGENT_INSTALL_DIR="${smoke_root}/bin"
  export AGENT_HOME="${smoke_root}/home"
  export AGENT_VERSION="${old_version}"
  export AGENT_LOCAL_ARCHIVE="${old_archive}"
  ./agent/install.sh
  agentctl="${AGENT_INSTALL_DIR}/agentctl"
  export AGENT_LOCAL_ARCHIVE="${target_archive}"
  unset AGENT_INSTALL_ROOT AGENT_INSTALL_DIR
  "${agentctl}" --home "${AGENT_HOME}" self update --version "${target_version}"
  test "$("${agentctl}" --version)" = "agentctl ${target_version}"
  "${agentctl}" --home "${AGENT_HOME}" self update --version "${target_version}"
fi
