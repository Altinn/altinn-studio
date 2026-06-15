#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[runner-dind] %s\n' "$*" >&2
}

fs_type() {
  df -PT "$1" | awk 'NR == 2 { print $2 }'
}

ensure_loop_devices() {
  local index

  if [[ ! -e /dev/loop-control ]]; then
    log "creating missing /dev/loop-control"
    mknod /dev/loop-control c 10 237 2>/dev/null || true
  fi

  for index in $(seq 0 7); do
    if [[ ! -e "/dev/loop${index}" ]]; then
      mknod "/dev/loop${index}" b 7 "${index}" 2>/dev/null || true
    fi
  done
}

mount_ext4_image() {
  local image="$1"
  local size="$2"
  local mountpoint="$3"

  if mountpoint -q "${mountpoint}"; then
    log "${mountpoint} is already a mountpoint"
    return
  fi

  log "mounting ${size} ext4 image at ${mountpoint}"
  mkdir -p "$(dirname "${image}")" "${mountpoint}"
  truncate -s "${size}" "${image}"
  mkfs.ext4 -F -q "${image}"
  ensure_loop_devices

  if mount -o loop,noatime "${image}" "${mountpoint}"; then
    return
  fi

  log "failed to mount ext4 image at ${mountpoint}; continuing on existing filesystem"
  log "mountpoint diagnostics for ${mountpoint}"
  ls -ld "${mountpoint}" "$(dirname "${mountpoint}")" 2>&1 || true
  log "loop device diagnostics"
  losetup -f 2>&1 || true
  ls -l /dev/loop* 2>&1 || true
}

maybe_mount_ext4_image() {
  local image="$1"
  local size="$2"
  local mountpoint="$3"
  local type

  mkdir -p "${mountpoint}"
  type="$(fs_type "${mountpoint}")"

  if [[ "${type}" != "virtiofs" ]]; then
    log "${mountpoint} is ${type}; keeping existing filesystem"
    return
  fi

  mount_ext4_image "${image}" "${size}" "${mountpoint}"
}

wait_for_docker() {
  local attempt

  for attempt in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  log "dockerd did not become ready"
  docker info || true
  return 1
}

stop_dockerd() {
  local pid="$1"

  if [[ -z "${pid}" ]] || ! kill -0 "${pid}" 2>/dev/null; then
    return
  fi

  log "stopping dockerd"
  kill "${pid}" 2>/dev/null || true
  wait "${pid}" 2>/dev/null || true
}

terminate_runner() {
  local pid="$1"

  if [[ -z "${pid}" ]] || ! kill -0 "${pid}" 2>/dev/null; then
    return
  fi

  log "terminating runner"
  kill "${pid}" 2>/dev/null || true
  wait "${pid}" 2>/dev/null || true
}

RUNNER_HOME="${RUNNER_HOME:-/home/runner}"
export RUNNER_WORKDIR="${RUNNER_WORKDIR:-${RUNNER_HOME}/_work}"
export DOCKER_HOST="${DOCKER_HOST:-unix:///var/run/docker.sock}"
export HOME="${RUNNER_HOME}"
export USER=runner
export LOGNAME=runner

RUNNER_WORK_DISK_SIZE="${RUNNER_WORK_DISK_SIZE:-20G}"
DOCKER_DISK_SIZE="${DOCKER_DISK_SIZE:-30G}"
RUNNER_DIND_DISK_DIR="${RUNNER_DIND_DISK_DIR:-/var/lib/github-runner-disks}"
runner_pid=""

mkdir -p "${RUNNER_HOME}" "${RUNNER_WORKDIR}" /var/lib/docker /var/run "${RUNNER_DIND_DISK_DIR}"

maybe_mount_ext4_image "${RUNNER_DIND_DISK_DIR}/runner-work.img" "${RUNNER_WORK_DISK_SIZE}" "${RUNNER_WORKDIR}"
maybe_mount_ext4_image "${RUNNER_DIND_DISK_DIR}/docker.img" "${DOCKER_DISK_SIZE}" /var/lib/docker

mkdir -p \
  "${RUNNER_WORKDIR}/_temp" \
  "${RUNNER_HOME}/.cache/go-build" \
  "${RUNNER_HOME}/.cache/yarn" \
  "${RUNNER_HOME}/.npm" \
  "${RUNNER_HOME}/.nuget/packages" \
  "${RUNNER_HOME}/go/pkg/mod"
chown -R runner:runner \
  "${RUNNER_WORKDIR}" \
  "${RUNNER_HOME}/.cache" \
  "${RUNNER_HOME}/.npm" \
  "${RUNNER_HOME}/.nuget" \
  "${RUNNER_HOME}/go"

log "filesystem layout before dockerd startup"
df -PT / "${RUNNER_WORKDIR}" /var/lib/docker /tmp || true

dockerd --host="${DOCKER_HOST}" --ip6tables=false &
dockerd_pid="$!"

cleanup() {
  terminate_runner "${runner_pid:-}"
  stop_dockerd "${dockerd_pid:-}"
}
trap cleanup EXIT INT TERM

wait_for_docker
chgrp docker /var/run/docker.sock 2>/dev/null || true
chmod 660 /var/run/docker.sock 2>/dev/null || true

log "docker is ready"
docker info || true

set +e
runuser --preserve-environment -u runner -- /usr/local/bin/altinn-github-runner &
runner_pid="$!"
wait "${runner_pid}"
runner_status="$?"
set -e
runner_pid=""

exit "${runner_status}"
