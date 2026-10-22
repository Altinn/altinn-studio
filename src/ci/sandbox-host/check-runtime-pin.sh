#!/usr/bin/env bash
# Checks that a Dockerfile downloads the Microsandbox runtime that matches the microsandbox crate in Cargo.lock.
# Each crate that downloads the runtime runs this in `make deps-check`.
set -euo pipefail

dockerfile="${1:?usage: check-runtime-pin.sh <Dockerfile>}"
lockfile="$(dirname "$(cargo locate-project --workspace --message-format plain)")/Cargo.lock"
lock_version="$(awk '
  $0 == "name = \"microsandbox\"" { found = 1; next }
  found && /^version = / { gsub(/"/, "", $3); print $3; exit }
' "${lockfile}")"
runtime_version="$(sed -n 's/^ARG MICROSANDBOX_RUNTIME_VERSION=//p' "${dockerfile}")"

if [ -z "${lock_version}" ] || [ "${runtime_version}" != "${lock_version}" ]; then
  echo "${dockerfile}: MICROSANDBOX_RUNTIME_VERSION is ${runtime_version:-missing}, but Cargo.lock has microsandbox ${lock_version:-missing}." >&2
  exit 1
fi
echo "✓ ${dockerfile} downloads Microsandbox ${runtime_version}"
