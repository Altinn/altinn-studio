#!/usr/bin/env bash

set -euo pipefail

readonly ARRAY_DEVICE=/dev/md/altinn-sandbox
readonly ARRAY_NAME=altinn-sandbox
readonly FILESYSTEM_LABEL=altinn-sbx
readonly MOUNT_POINT=/var/lib/altinn/sandbox
LOCAL_NVME_DEVICES=()

log() {
  printf 'sandbox-node: %s\n' "$*"
}

fail() {
  log "$*" >&2
  exit 1
}

discover_local_nvme_devices() {
  local device

  shopt -s nullglob
  for device in /dev/nvme*n1; do
    [[ -b "${device}" ]] || continue
    if nvme id-ctrl "${device}" 2>/dev/null | grep -Eq \
      '^[[:space:]]*mn[[:space:]]*:[[:space:]]*Microsoft NVMe Direct Disk([[:space:]]|$)'; then
      LOCAL_NVME_DEVICES+=("$(readlink -f "${device}")")
    fi
  done
  shopt -u nullglob

  ((${#LOCAL_NVME_DEVICES[@]} > 0)) || fail 'no Azure local NVMe data disks found'
}

verify_array_members() {
  local source="$1"
  shift
  local -a expected=("$@")
  local resolved md_name slaves member details

  resolved="$(readlink -f "${source}")"
  md_name="$(basename "${resolved}")"
  slaves="/sys/class/block/${md_name}/slaves"
  [[ -d "${slaves}" ]] || fail "${source} is not an md array"
  details="$(mdadm --detail --export "${resolved}")"
  grep -Fxq 'MD_LEVEL=raid0' <<<"${details}" || fail "${source} is not RAID0"
  grep -Fxq "MD_DEVICES=${#expected[@]}" <<<"${details}" ||
    fail "${source} has an unexpected device count"

  for member in "${expected[@]}"; do
    [[ -e "${slaves}/$(basename "${member}")" ]] ||
      fail "${source} does not contain expected member ${member}"
  done

  [[ "$(find "${slaves}" -mindepth 1 -maxdepth 1 -printf '.' | wc -c)" -eq "${#expected[@]}" ]] ||
    fail "${source} contains unexpected members"
}

verify_storage() {
  local source filesystem probe
  local -a expected=("$@")

  mountpoint --quiet "${MOUNT_POINT}" || fail "${MOUNT_POINT} is not mounted"
  source="$(findmnt --noheadings --output SOURCE --target "${MOUNT_POINT}")"
  filesystem="$(findmnt --noheadings --output FSTYPE --target "${MOUNT_POINT}")"
  [[ "${filesystem}" == xfs ]] || fail "${MOUNT_POINT} uses ${filesystem}, expected xfs"
  verify_array_members "${source}" "${expected[@]}"
  xfs_info "${MOUNT_POINT}" | grep -Eq '(^|[[:space:]])reflink=1([[:space:]]|$)' ||
    fail "${MOUNT_POINT} does not have XFS reflink support enabled"

  probe="$(mktemp "${MOUNT_POINT}/.sandbox-node-write.XXXXXX")"
  rm -f "${probe}"
  install -d -m 0755 "${MOUNT_POINT}/cache" "${MOUNT_POINT}/homes"
}

device_signature() {
  wipefs --noheadings --output TYPE "$1" | awk 'NF { print }'
}

assemble_or_create_array() {
  local -a devices=("$@")
  local device signature
  local raw=0
  local members=0

  for device in "${devices[@]}"; do
    [[ -z "$(lsblk --noheadings --output MOUNTPOINTS "${device}" | awk 'NF')" ]] ||
      fail "candidate local disk ${device} is already mounted"
    signature="$(device_signature "${device}")"
    case "${signature}" in
      '') ((raw += 1)) ;;
      linux_raid_member) ((members += 1)) ;;
      *) fail "candidate local disk ${device} has conflicting signature: ${signature//$'\n'/, }" ;;
    esac
  done

  mkdir -p "$(dirname "${ARRAY_DEVICE}")"
  if [[ -b "${ARRAY_DEVICE}" ]]; then
    log "validating active array ${ARRAY_DEVICE}"
    verify_array_members "${ARRAY_DEVICE}" "${devices[@]}"
    return
  elif ((members == ${#devices[@]})); then
    log "assembling ${ARRAY_DEVICE} from ${#devices[@]} local NVMe disks"
    mdadm --assemble "${ARRAY_DEVICE}" "${devices[@]}"
  elif ((raw == ${#devices[@]})); then
    log "creating RAID0 ${ARRAY_DEVICE} from ${#devices[@]} local NVMe disks"
    mdadm --create "${ARRAY_DEVICE}" \
      --name="${ARRAY_NAME}" \
      --metadata=1.2 \
      --level=0 \
      --raid-devices="${#devices[@]}" \
      --run \
      "${devices[@]}"
  else
    fail 'local NVMe disks contain a partial RAID configuration'
  fi

  verify_array_members "${ARRAY_DEVICE}" "${devices[@]}"
}

format_and_mount() {
  local filesystem label

  filesystem="$(blkid --output value --match-tag TYPE "${ARRAY_DEVICE}" || true)"
  case "${filesystem}" in
    '')
      log "formatting ${ARRAY_DEVICE} as XFS with reflink support"
      mkfs.xfs -m reflink=1 -L "${FILESYSTEM_LABEL}" "${ARRAY_DEVICE}"
      ;;
    xfs)
      label="$(blkid --output value --match-tag LABEL "${ARRAY_DEVICE}" || true)"
      [[ "${label}" == "${FILESYSTEM_LABEL}" ]] ||
        fail "${ARRAY_DEVICE} has unexpected XFS label: ${label:-<none>}"
      ;;
    *) fail "${ARRAY_DEVICE} has unexpected filesystem: ${filesystem}" ;;
  esac

  mkdir -p "${MOUNT_POINT}"
  mount -t xfs -o noatime "${ARRAY_DEVICE}" "${MOUNT_POINT}"
}

main() {
  discover_local_nvme_devices
  log "found ${#LOCAL_NVME_DEVICES[@]} Azure local NVMe data disks: ${LOCAL_NVME_DEVICES[*]}"

  if mountpoint --quiet "${MOUNT_POINT}"; then
    log "validating existing mount at ${MOUNT_POINT}"
    verify_storage "${LOCAL_NVME_DEVICES[@]}"
    return
  fi

  assemble_or_create_array "${LOCAL_NVME_DEVICES[@]}"
  format_and_mount
  verify_storage "${LOCAL_NVME_DEVICES[@]}"
  log "storage ready at ${MOUNT_POINT}"
}

main "$@"
