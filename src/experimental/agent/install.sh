#!/bin/sh
set -eu
umask 077

repository="${AGENT_GITHUB_REPOSITORY:-Altinn/altinn-studio}"
version="${AGENT_VERSION:-}"
bin_directory="${AGENT_INSTALL_DIR:-${HOME}/.local/bin}"
install_root="${AGENT_INSTALL_ROOT:-${XDG_DATA_HOME:-${HOME}/.local/share}/agent}"
agent_home="${AGENT_HOME:-${HOME}/.agent}"
local_archive="${AGENT_LOCAL_ARCHIVE:-}"

case "${install_root}" in /*) ;; *) install_root="$(pwd)/${install_root}" ;; esac
case "${bin_directory}" in /*) ;; *) bin_directory="$(pwd)/${bin_directory}" ;; esac
case "${agent_home}" in /*) ;; *) agent_home="$(pwd)/${agent_home}" ;; esac
if [ -n "${local_archive}" ]; then
  case "${local_archive}" in /*) ;; *) local_archive="$(pwd)/${local_archive}" ;; esac
fi
journal="${install_root}/update.json"

resume_update() {
  target="$(sed -n 's/^  "targetRelease": "\(.*\)",$/\1/p' "${journal}")"
  target_version="$(sed -n 's/^  "targetVersion": "\(.*\)",$/\1/p' "${journal}")"
  previous="$(sed -n 's/^  "previousRelease": "\(.*\)",$/\1/p' "${journal}")"
  if [ -z "${target}" ] || [ -z "${target_version}" ] || [ ! -x "${target}/agentctl" ]; then
    echo "The Agent update journal does not name a usable staged release: ${journal}" >&2
    exit 1
  fi
  set -- --home "${agent_home}" self __complete-update \
    --install-root "${install_root}" --bin-directory "${bin_directory}" \
    --agent-home "${agent_home}" --target-release "${target}" \
    --target-version "${target_version}" --repository "${repository}"
  if [ -n "${previous}" ]; then
    set -- "$@" --previous-release "${previous}"
  fi
  "${target}/agentctl" "$@"
}

if [ -f "${journal}" ] && ! grep -q '^  "phase": "complete"$' "${journal}"; then
  resume_update
  echo "Installed agentctl and agentd to ${bin_directory}"
  exit 0
fi

if [ -n "${local_archive}" ] && [ -z "${version}" ]; then
  echo "AGENT_VERSION is required when AGENT_LOCAL_ARCHIVE is set" >&2
  exit 1
fi
if [ -z "${version}" ]; then
  page=1
  while [ -z "${version}" ]; do
    releases="$(curl -fsSL "https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}")"
    version="$(printf '%s' "${releases}" \
      | sed -n 's/.*"tag_name": "experimental-agent\/\(v[^"]*\)".*/\1/p' \
      | head -n 1)"
    [ "${releases}" != "[]" ] || break
    page=$((page + 1))
  done
fi
if [ -z "${version}" ]; then
  echo "Could not resolve the latest experimental Agent release" >&2
  exit 1
fi
case "${version}" in
  v*) ;;
  *) version="v${version}" ;;
esac

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) platform=linux-x86_64 ;;
  Linux-aarch64 | Linux-arm64) platform=linux-aarch64 ;;
  Darwin-arm64) platform=macos-aarch64 ;;
  *) echo "Unsupported Agent host: $(uname -s) $(uname -m)" >&2; exit 1 ;;
esac

temporary="$(mktemp -d -t altinn-agent-install.XXXXXXXX)"
source_release="${temporary}/release"
trap 'rm -rf "${temporary}"' EXIT HUP INT TERM

target="${install_root}/releases/${version}-${platform}"
if [ ! -d "${target}" ]; then
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
  mkdir "${source_release}"
  tar -xzf "${temporary}/${archive}" -C "${source_release}"
  chmod 0755 "${source_release}/agentctl" "${source_release}/agentd"
  "${source_release}/agentctl" --home "${agent_home}" self __publish-release \
    --install-root "${install_root}" --bin-directory "${bin_directory}" \
    --source-release "${source_release}" --target-version "${version}"
fi

previous=""
if [ -L "${install_root}/current" ]; then
  previous="$(readlink "${install_root}/current")"
  case "${previous}" in
    /*) ;;
    *) previous="${install_root}/${previous}" ;;
  esac
fi
set -- --home "${agent_home}" self __complete-update \
  --install-root "${install_root}" --bin-directory "${bin_directory}" \
  --agent-home "${agent_home}" --target-release "${target}" \
  --target-version "${version}" --repository "${repository}"
if [ -n "${previous}" ]; then
  set -- "$@" --previous-release "${previous}"
fi
"${target}/agentctl" "$@"
echo "Installed agentctl and agentd to ${bin_directory}"
