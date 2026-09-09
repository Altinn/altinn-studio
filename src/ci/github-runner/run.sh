#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[github-runner] %s\n' "$*" >&2
}

if (( EUID != 0 )); then
  exec sudo --preserve-env -- "$0" "$@"
fi

filesystem_type() {
  df -PT "$1" | awk 'NR == 2 { print $2 }'
}

require_filesystem() {
  local path="$1"
  local expected="$2"
  local type

  type="$(filesystem_type "${path}")"
  if [[ "${type}" != "${expected}" ]]; then
    log "${path} is ${type}, expected ${expected}"
    return 1
  fi
  log "${path} is ${expected}"
}

configure_runner_tmp() {
  local type

  type="$(filesystem_type /tmp)"
  if [[ "${type}" == "tmpfs" ]]; then
    mount -o remount,size=2G,mode=1777,nosuid,nodev /tmp
  else
    mount -t tmpfs -o size=2G,mode=1777,nosuid,nodev tmpfs /tmp
  fi
  chmod 1777 /tmp
}

raise_proc_limit() {
  local path="$1"
  local value="$2"
  local name="$3"
  local current

  if [[ ! -r "${path}" ]]; then
    log "${name} is not readable; keeping kernel default"
    return
  fi

  current="$(cat "${path}")"
  if [[ "${current}" =~ ^[0-9]+$ ]] && (( current >= value )); then
    log "${name} is ${current}; keeping existing value"
    return
  fi

  if [[ ! -w "${path}" ]]; then
    log "${name} is ${current}; cannot raise to ${value}"
    return
  fi

  if echo "${value}" > "${path}"; then
    log "set ${name}=${value}"
  else
    log "failed to set ${name}=${value}; keeping ${current}"
  fi
}

configure_kernel_limits() {
  raise_proc_limit /proc/sys/fs/inotify/max_user_instances 1024 fs.inotify.max_user_instances
  raise_proc_limit /proc/sys/fs/inotify/max_user_watches 1048576 fs.inotify.max_user_watches
  raise_proc_limit /proc/sys/fs/inotify/max_queued_events 32768 fs.inotify.max_queued_events
}

wait_for_docker() {
  for _ in {1..60}; do
    if docker info >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  log "dockerd did not become ready"
  docker info || true
  return 1
}

# Called by the signal/exit trap through cleanup.
# shellcheck disable=SC2329
terminate_process() {
  local name="$1"
  local pid="$2"

  if [[ -z "${pid}" ]] || ! kill -0 "${pid}" 2>/dev/null; then
    return
  fi

  log "stopping ${name}"
  kill -TERM "${pid}" 2>/dev/null || true
  wait "${pid}" 2>/dev/null || true
}

RUNNER_HOME="${RUNNER_HOME:-/home/runner}"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-${RUNNER_HOME}/_work}"
RUNNER_NAME="${RUNNER_NAME:-$(hostname)}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted-ubuntu}"
RUNNER_GROUP="${RUNNER_GROUP:-Default}"
DOCKER_REGISTRY_MIRROR="${DOCKER_REGISTRY_MIRROR:-https://mirror.gcr.io}"

: "${RUNNER_REGISTRATION_TOKEN:?RUNNER_REGISTRATION_TOKEN is required}"
: "${RUNNER_URL:?RUNNER_URL is required}"

export HOME="${RUNNER_HOME}"
export USER=runner
export LOGNAME=runner
export DOCKER_HOST="${DOCKER_HOST:-unix:///var/run/docker.sock}"
export GOPATH="${GOPATH:-${RUNNER_HOME}/go}"
export GOCACHE="${GOCACHE:-${RUNNER_HOME}/.cache/go-build}"
export GOMODCACHE="${GOMODCACHE:-${GOPATH}/pkg/mod}"
export NUGET_PACKAGES="${NUGET_PACKAGES:-${RUNNER_HOME}/.nuget/packages}"
export npm_config_cache="${npm_config_cache:-${RUNNER_HOME}/.npm}"
export YARN_CACHE_FOLDER="${YARN_CACHE_FOLDER:-${RUNNER_HOME}/.cache/yarn}"

runner_pid=""
dockerd_pid=""

# Called by name from the trap below.
# shellcheck disable=SC2329
cleanup() {
  terminate_process runner "${runner_pid:-}"
  terminate_process dockerd "${dockerd_pid:-}"
}
trap cleanup EXIT INT TERM

configure_kernel_limits

mkdir -p \
  "${RUNNER_WORKDIR}/_temp" \
  "${GOCACHE}" \
  "${YARN_CACHE_FOLDER}" \
  "${npm_config_cache}" \
  "${NUGET_PACKAGES}" \
  "${GOMODCACHE}" \
  /var/lib/docker \
  /var/run
chown runner:runner "${RUNNER_HOME}"
chown -R runner:runner \
  "${RUNNER_WORKDIR}" \
  "${GOCACHE}" \
  "${YARN_CACHE_FOLDER}" \
  "${npm_config_cache}" \
  "${NUGET_PACKAGES}" \
  "${GOMODCACHE}"

# Match the previous runner's bounded, memory-backed /tmp. Browser workloads
# use it heavily, while workspaces, caches and Docker data remain on ext4.
configure_runner_tmp

require_filesystem / ext4
require_filesystem "${RUNNER_HOME}" ext4
require_filesystem "${RUNNER_WORKDIR}" ext4
require_filesystem /tmp tmpfs
require_filesystem /var/lib/docker ext4

if ! grep -Eq '^[[:space:]]*127\.0\.0\.1[[:space:]].*\bstudio\.localhost\b' /etc/hosts; then
  printf '127.0.0.1 studio.localhost\n' >> /etc/hosts
fi

dockerd_args=(
  --host="${DOCKER_HOST}"
  --ip6tables=false
  --feature containerd-snapshotter=true
)
if [[ -n "${DOCKER_REGISTRY_MIRROR}" ]]; then
  dockerd_args+=(--registry-mirror="${DOCKER_REGISTRY_MIRROR}")
fi

dockerd "${dockerd_args[@]}" &
dockerd_pid="$!"
wait_for_docker

# With the containerd-snapshotter feature enabled, `docker info` reports the
# snapshotter name (overlayfs) rather than the classic overlay2 graph driver.
docker_driver="$(docker info --format '{{.Driver}}')"
if [[ "${docker_driver}" != "overlayfs" ]]; then
  log "Docker storage driver is ${docker_driver}, expected overlayfs"
  exit 1
fi
log "Docker is ready with overlayfs (containerd snapshotter)"

export ACTIONS_RUNNER_INPUT_TOKEN="${RUNNER_REGISTRATION_TOKEN}"
unset RUNNER_REGISTRATION_TOKEN

runuser --preserve-environment -u runner -- "${RUNNER_HOME}/config.sh" \
  --url "${RUNNER_URL}" \
  --name "${RUNNER_NAME}" \
  --work "${RUNNER_WORKDIR}" \
  --labels "${RUNNER_LABELS}" \
  --runnergroup "${RUNNER_GROUP}" \
  --unattended \
  --ephemeral \
  --replace \
  --disableupdate

unset ACTIONS_RUNNER_INPUT_TOKEN

set +e
runuser --preserve-environment -u runner -- "${RUNNER_HOME}/run.sh" &
runner_pid="$!"
wait "${runner_pid}"
runner_status="$?"
set -e
runner_pid=""

exit "${runner_status}"
