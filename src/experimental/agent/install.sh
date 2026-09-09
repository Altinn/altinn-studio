#!/bin/sh
set -eu

repository="${AGENT_GITHUB_REPOSITORY:-Altinn/altinn-studio}"
version="${AGENT_VERSION:-}"
install_directory="${AGENT_INSTALL_DIR:-${HOME}/.local/bin}"
local_archive="${AGENT_LOCAL_ARCHIVE:-}"

if [ -z "${local_archive}" ] && [ -z "${version}" ]; then
  version="$(curl -fsSL "https://api.github.com/repos/${repository}/releases?per_page=100" \
    | sed -n 's/.*"tag_name": "experimental-agent\/\(v[^"]*\)".*/\1/p' \
    | head -n 1)"
fi
if [ -z "${local_archive}" ] && [ -z "${version}" ]; then
  echo "Could not resolve the latest experimental Agent release" >&2
  exit 1
fi

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) platform=linux-x86_64 ;;
  Linux-aarch64 | Linux-arm64) platform=linux-aarch64 ;;
  Darwin-arm64) platform=macos-aarch64 ;;
  *) echo "Unsupported Agent host: $(uname -s) $(uname -m)" >&2; exit 1 ;;
esac

temporary="$(mktemp -d -t altinn-agent-install.XXXXXXXX)"
trap 'rm -rf "${temporary}"' EXIT HUP INT TERM

if [ -n "${local_archive}" ]; then
  archive="$(basename "${local_archive}")"
  cp "${local_archive}" "${temporary}/${archive}"
  cp "${AGENT_LOCAL_ARCHIVE_SHA256:-${local_archive}.sha256}" "${temporary}/${archive}.sha256"
else
  archive="agent-${platform}.tar.gz"
  base="https://github.com/${repository}/releases/download/experimental-agent/${version}"
  curl -fsSL "${base}/${archive}" -o "${temporary}/${archive}"
  curl -fsSL "${base}/${archive}.sha256" -o "${temporary}/${archive}.sha256"
fi
if command -v sha256sum >/dev/null 2>&1; then
  (cd "${temporary}" && sha256sum -c "${archive}.sha256")
else
  (cd "${temporary}" && shasum -a 256 -c "${archive}.sha256")
fi
mkdir -p "${install_directory}"
tar -xzf "${temporary}/${archive}" -C "${install_directory}"
chmod 0755 "${install_directory}/agentctl" "${install_directory}/agentd"
echo "Installed agentctl and agentd to ${install_directory}"
