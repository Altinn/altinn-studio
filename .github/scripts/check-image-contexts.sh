#!/usr/bin/env bash
# Checks that the images built from src/ follow the build context convention in .github/README.md, and that each
# container tool given as an argument sends them the same context. Prints each image's context size.
#
# Usage: check-image-contexts.sh [tool...]   (default: docker podman)
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
context_dir="${repo_root}/src"

# The images built from src/, by Dockerfile relative to src/. Add an image here when you add it to src/.
images=(
  Designer/backend/Migrations.Dockerfile
  Runtime/gateway/Dockerfile
  Runtime/kubernetes-wrapper/src/Dockerfile
  Runtime/localtest/Dockerfile
  Runtime/operator/Dockerfile
  Runtime/operator/Dockerfile.fakes
  Runtime/pdf3/Dockerfile.proxy
  Runtime/pdf3/Dockerfile.worker
  Runtime/workflow-engine/Dockerfile
  Runtime/workflow-engine-app/Dockerfile
)

# A context above this size likely sends more than the image needs.
max_context_bytes=$((20 * 1024 * 1024))

if [ "$#" -gt 0 ]; then
  tools=("$@")
else
  tools=(docker podman)
fi

failures=0
fail() {
  echo "::error::$*"
  failures=$((failures + 1))
}

# Podman uses a context's own ignore file instead of the Dockerfile's.
for name in .dockerignore .containerignore; do
  if [ -e "${context_dir}/${name}" ]; then
    fail "src/${name} makes Podman ignore every image's Dockerfile.dockerignore. Remove it."
  fi
done

work_dir="$(mktemp -d)"
# The probe must be inside the context, since remote Podman reads a Dockerfile's ignore file only there.
probe_dir="$(mktemp -d "${context_dir}/.image-context-probe.XXXXXX")"
trap 'rm -rf "${work_dir}" "${probe_dir}"' EXIT
printf 'FROM scratch\nCOPY . /ctx/\n' >"${probe_dir}/Dockerfile"

# Writes the files that a tool sends as the context, as "<size> <path>" lines, to the given file.
list_context() {
  local tool="$1" output="$2" tag container
  tag="image-context-probe:$$"
  "${tool}" build --quiet --file "${probe_dir}/Dockerfile" --tag "${tag}" "${context_dir}" >/dev/null
  container="$("${tool}" create "${tag}" probe)"
  mkdir -p "${work_dir}/export"
  "${tool}" export "${container}" | tar -xf - -C "${work_dir}/export" ctx 2>/dev/null || true
  "${tool}" rm "${container}" >/dev/null
  "${tool}" rmi "${tag}" >/dev/null
  if [ -d "${work_dir}/export/ctx" ]; then
    (cd "${work_dir}/export/ctx" && find . ! -type d -printf '%s %P\n' | LC_ALL=C sort -k2) >"${output}"
  else
    : >"${output}"
  fi
  rm -rf "${work_dir}/export"
}

printf '%-45s %-10s %8s %10s\n' Dockerfile Tool Files KiB
for image in "${images[@]}"; do
  allowlist="${context_dir}/${image}.dockerignore"
  if [ ! -f "${allowlist}" ]; then
    fail "src/${image} has no allowlist. Add src/${image}.dockerignore."
    continue
  fi
  # Podman does not re-include a file through **/ inside a directory that an earlier pattern excluded.
  if grep -nE '^[[:space:]]*!.*\*\*/' "${allowlist}" >"${work_dir}/reincludes"; then
    fail "src/${image}.dockerignore re-includes through **/, which Podman matches differently: $(paste -sd ' ' "${work_dir}/reincludes")"
  fi

  cp "${allowlist}" "${probe_dir}/Dockerfile.dockerignore"
  first=""
  for tool in "${tools[@]}"; do
    listing="${work_dir}/$(basename "${tool}").txt"
    list_context "${tool}" "${listing}"
    files="$(wc -l <"${listing}")"
    bytes="$(awk '{ sum += $1 } END { print sum + 0 }' "${listing}")"
    printf '%-45s %-10s %8d %10d\n' "${image}" "$(basename "${tool}")" "${files}" "$((bytes / 1024))"
    if [ "${bytes}" -gt "${max_context_bytes}" ]; then
      fail "${tool} sends $((bytes / 1024 / 1024)) MiB as the context of src/${image}, above the $((max_context_bytes / 1024 / 1024)) MiB budget."
    fi
    if [ -z "${first}" ]; then
      first="${listing}"
    elif ! diff -u "${first}" "${listing}" >"${work_dir}/diff"; then
      fail "$(basename "${tools[0]}") and ${tool} send different contexts for src/${image}:"
      head -n 40 "${work_dir}/diff"
    fi
  done
done

if [ "${failures}" -gt 0 ]; then
  echo "${failures} problem(s) with the image build contexts. See .github/README.md."
  exit 1
fi
