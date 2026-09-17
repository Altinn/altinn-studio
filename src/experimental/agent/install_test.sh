#!/usr/bin/env bash
set -euo pipefail

test_root="$(mktemp -d -t agent-install-test.XXXXXXXX)"
cleanup() {
  rm -rf -- "${test_root}"
}
trap cleanup EXIT HUP INT TERM

payload="${test_root}/payload"
archive="${test_root}/agent-linux-x86_64.tar.gz"
bin_directory="${test_root}/bin"
install_root="${test_root}/managed"
agent_home="${test_root}/home"
mkdir -p "${payload}" "${install_root}"
printf '#!/bin/sh\nprintf "agentctl standalone-test\\n"\n' > "${payload}/agentctl"
printf '#!/bin/sh\nprintf "agentd standalone-test\\n"\n' > "${payload}/agentd"
chmod +x "${payload}/agentctl" "${payload}/agentd"
tar -czf "${archive}" -C "${payload}" agentctl agentd
(
  cd "${test_root}"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${archive##*/}" > "${archive##*/}.sha256"
  else
    shasum -a 256 "${archive##*/}" > "${archive##*/}.sha256"
  fi
)
printf '{ "phase": "prepared" }\n' > "${install_root}/update.json"

output="$(
  HOME="${test_root}/unused-home" \
    AGENT_INSTALL_MODE=standalone \
    AGENT_VERSION=standalone-test \
    AGENT_INSTALL_DIR="${bin_directory}" \
    AGENT_INSTALL_ROOT="${install_root}" \
    AGENT_HOME="${agent_home}" \
    AGENT_LOCAL_ARCHIVE="${archive}" \
    ./agent/install.sh
)"

expected="${archive##*/}: OK
Installed standalone agentctl and agentd to ${bin_directory}"
test "${output}" = "${expected}"
test "$("${bin_directory}/agentctl")" = "agentctl standalone-test"
test "$("${bin_directory}/agentd")" = "agentd standalone-test"
test ! -e "${install_root}/releases"
test ! -e "${agent_home}"
test "$(cat "${install_root}/update.json")" = '{ "phase": "prepared" }'

invalid_root="${test_root}/invalid"
if HOME="${test_root}/unused-home" \
  AGENT_INSTALL_MODE=invalid \
  AGENT_INSTALL_DIR="${invalid_root}" \
  ./agent/install.sh > "${test_root}/invalid.out" 2> "${test_root}/invalid.err"; then
  echo "invalid install mode unexpectedly succeeded" >&2
  exit 1
fi
test ! -e "${invalid_root}"
test ! -s "${test_root}/invalid.out"
test "$(cat "${test_root}/invalid.err")" = 'AGENT_INSTALL_MODE must be "managed" or "standalone"'

echo "Standalone installer tests passed"
