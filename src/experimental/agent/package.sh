#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 ARCHIVE BINARY_DIRECTORY" >&2
  exit 1
fi

archive="$1"
binary_directory="$2"
executable_suffix=""
if [ -f "${binary_directory}/agentctl.exe" ] && [ -f "${binary_directory}/agentd.exe" ]; then
  executable_suffix=".exe"
fi

for binary in agentctl agentd; do
  if [ ! -f "${binary_directory}/${binary}${executable_suffix}" ]; then
    echo "Missing Agent binary: ${binary_directory}/${binary}${executable_suffix}" >&2
    exit 1
  fi
done

archive_directory="$(dirname "${archive}")"
archive_name="$(basename "${archive}")"
mkdir -p "${archive_directory}"
temporary="$(mktemp -d -t altinn-agent-package.XXXXXXXX)"
trap 'rm -rf "${temporary}"' EXIT HUP INT TERM

cp "${binary_directory}/agentctl${executable_suffix}" "${binary_directory}/agentd${executable_suffix}" "${temporary}/"
tar -czf "${archive}" -C "${temporary}" "agentctl${executable_suffix}" "agentd${executable_suffix}"
if command -v sha256sum >/dev/null 2>&1; then
  digest="$(sha256sum "${archive}" | awk '{ print $1 }')"
else
  digest="$(shasum -a 256 "${archive}" | awk '{ print $1 }')"
fi
printf '%s  %s\n' "${digest}" "${archive_name}" > "${archive}.sha256"
