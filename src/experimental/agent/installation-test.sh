#!/usr/bin/env bash
# Exercises standalone installation and the managed installation and upgrade lifecycle.
set -euo pipefail

old_version="v0.0.1-dev.upgrade-smoke"
target_version="v0.1.0-preview.2.smoke"
smoke_root="$(mktemp -d /tmp/au.XXXXXXXX)"
export AGENT_SMOKE_ID="${smoke_root##*/}"
# Build outside smoke_root: CI runners keep /tmp on a small tmpfs, and the two
# dev-profile builds below do not fit there.
smoke_target="${CARGO_TARGET_DIR:-$(git rev-parse --show-toplevel)/target}/upgrade-smoke-${AGENT_SMOKE_ID}"
binary_directory="${smoke_target}/debug"
target_binaries="${smoke_root}/target-binaries"
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
        Where-Object {
          $_.Name -eq "agentd.exe" -and
          ($_.CommandLine -like "*$env:AGENT_SMOKE_ID*" -or $_.ExecutablePath -like "*$env:AGENT_SMOKE_ID*")
        } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    ' 2>/dev/null || true
  else
    pkill -f "agentd.*--home ${AGENT_HOME}" 2>/dev/null || true
  fi
  rm -rf -- "${smoke_root}" "${smoke_target}"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "${smoke_root}"

# Build release fixtures

CARGO_TARGET_DIR="${smoke_target}" CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0 \
  AGENT_VERSION="${old_version}" cargo build --locked -p agent --bins
./agent/package.sh "${old_archive}" "${binary_directory}"
CARGO_TARGET_DIR="${smoke_target}" CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0 \
  AGENT_VERSION="${target_version}" cargo build --locked -p agent --bins
suffix=""
if [ -f "${binary_directory}/agentctl.exe" ]; then
  suffix=".exe"
fi
mkdir "${target_binaries}"
mv "${binary_directory}/agentctl${suffix}" "${binary_directory}/agentd${suffix}" "${target_binaries}/"
rm -rf -- "${smoke_target}"
./agent/package.sh "${target_archive}" "${target_binaries}"

if [ "${RUNNER_OS:-}" = "Windows" ]; then
  # Standalone installation

  standalone_root="${smoke_root}/standalone"
  mkdir -p "${standalone_root}/managed"
  printf '{ "phase": "prepared" }\n' > "${standalone_root}/managed/update.json"
  export AGENT_INSTALL_MODE=standalone
  export AGENT_INSTALL_ROOT="$(cygpath -w "${standalone_root}/managed")"
  export AGENT_INSTALL_DIR="$(cygpath -w "${standalone_root}/bin")"
  export AGENT_HOME="$(cygpath -w "${standalone_root}/home")"
  export AGENT_VERSION="${target_version}"
  export AGENT_LOCAL_ARCHIVE="$(cygpath -w "${target_archive}")"
  pwsh -NoProfile -File "$(cygpath -w agent/install.ps1)"
  # shellcheck disable=SC2016 # PowerShell expands its own environment variables.
  pwsh -NoProfile -Command '
    $agentctl = Join-Path $env:AGENT_INSTALL_DIR "agentctl.exe"
    $agentd = Join-Path $env:AGENT_INSTALL_DIR "agentd.exe"
    if (-not (Test-Path $agentctl -PathType Leaf) -or -not (Test-Path $agentd -PathType Leaf)) {
      throw "standalone installation did not copy both binaries"
    }
    $actual = (& $agentctl --version | Out-String).Trim()
    if ($actual -ne "agentctl $env:AGENT_VERSION") {
      throw "standalone agentctl reports $actual"
    }
    if (Test-Path (Join-Path $env:AGENT_INSTALL_ROOT "releases")) {
      throw "standalone installation created a managed release tree"
    }
  '
  test "$(cat "${standalone_root}/managed/update.json")" = '{ "phase": "prepared" }'
  test ! -e "${standalone_root}/home"
  unset AGENT_INSTALL_MODE

  # Managed installation and self-update

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
  AGENT_INSTALL_ROOT="$(cygpath -w "${smoke_root}/install")"
  export AGENT_INSTALL_DIR="${AGENT_SMOKE_BIN}"
  AGENT_LOCAL_ARCHIVE="$(cygpath -w "${old_archive}")"
  export AGENT_VERSION="${old_version}"
  export AGENT_INSTALL_ROOT AGENT_LOCAL_ARCHIVE
  pwsh -NoProfile -File "$(cygpath -w agent/install.ps1)"
  # shellcheck disable=SC2016 # PowerShell expands its own environment variables.
  pwsh -NoProfile -Command '
    $agentctl = Join-Path $env:AGENT_SMOKE_BIN "agentctl.cmd"
    $actual = (& $agentctl --version | Out-String).Trim()
    if ($actual -ne "agentctl $env:AGENT_VERSION") {
      throw "installer did not replace a newer release with development build $actual"
    }
  '
else
  # Standalone installation

  standalone_root="${smoke_root}/standalone"
  mkdir -p "${standalone_root}/managed"
  printf '{ "phase": "prepared" }\n' > "${standalone_root}/managed/update.json"
  AGENT_INSTALL_MODE=standalone \
    AGENT_INSTALL_ROOT="${standalone_root}/managed" \
    AGENT_INSTALL_DIR="${standalone_root}/bin" \
    AGENT_HOME="${standalone_root}/home" \
    AGENT_VERSION="${target_version}" \
    AGENT_LOCAL_ARCHIVE="${target_archive}" \
    ./agent/install.sh
  test -x "${standalone_root}/bin/agentctl"
  test -x "${standalone_root}/bin/agentd"
  test "$("${standalone_root}/bin/agentctl" --version)" = "agentctl ${target_version}"
  test "$(find "${standalone_root}/bin" -type f | wc -l | tr -d ' ')" = 2
  test ! -e "${standalone_root}/managed/releases"
  test ! -e "${standalone_root}/home"
  test "$(cat "${standalone_root}/managed/update.json")" = '{ "phase": "prepared" }'

  # Managed installation and self-update

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
  export AGENT_INSTALL_ROOT="${smoke_root}/install"
  export AGENT_INSTALL_DIR="${smoke_root}/bin"
  export AGENT_LOCAL_ARCHIVE="${old_archive}"
  export AGENT_VERSION="${old_version}"
  ./agent/install.sh
  test "$("${agentctl}" --version)" = "agentctl ${old_version}"
fi
