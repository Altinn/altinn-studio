#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <runner-image> <output-directory>" >&2
  exit 1
fi

RUNNER_IMAGE="$1"
OUTPUT_DIR="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WARMUP_WORKFLOW_FILE="${SCRIPT_DIR}/gitea-runner-act-cache-warmup.yaml"

GITEA_IMAGE="gitea/gitea:1.26.1-rootless"
COMPOSE_PROJECT_NAME="act-cache-warmup-${GITHUB_RUN_ID:-local}-$$"
GITEA_URL="http://localhost:3000"
GITEA_INTERNAL_URL="http://gitea:3000"
ADMIN_USER="warmup-admin"
ADMIN_PASSWORD="$(openssl rand -hex 24)"
ADMIN_EMAIL="warmup-admin@example.com"
ORG_NAME="warmup"
REPO_NAME="act-cache"
WORKDIR="$(mktemp -d)"
COMPOSE_FILE="${WORKDIR}/compose.yaml"
OUTPUT_DIR_ABS=""
export REGISTRATION_TOKEN=""

cleanup() {
  docker compose --project-name "${COMPOSE_PROJECT_NAME}" --file "${COMPOSE_FILE}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -rf "${WORKDIR}"
}
trap cleanup EXIT

compose() {
  docker compose --project-name "${COMPOSE_PROJECT_NAME}" --file "${COMPOSE_FILE}" "$@"
}

wait_for_gitea() {
  for _ in $(seq 1 90); do
    if curl --fail --silent "${GITEA_URL}/api/healthz" >/dev/null; then
      return 0
    fi
    sleep 2
  done

  echo "Gitea did not become healthy" >&2
  compose logs gitea >&2 || true
  return 1
}

api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  if [[ -n "${data}" ]]; then
    curl --fail --silent --show-error \
      --user "${ADMIN_USER}:${ADMIN_PASSWORD}" \
      --request "${method}" \
      --header "Content-Type: application/json" \
      --data "${data}" \
      "${GITEA_URL}${path}"
  else
    curl --fail --silent --show-error \
      --user "${ADMIN_USER}:${ADMIN_PASSWORD}" \
      --request "${method}" \
      "${GITEA_URL}${path}"
  fi
}

rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"
OUTPUT_DIR_ABS="$(cd "${OUTPUT_DIR}" && pwd)"

cat > "${COMPOSE_FILE}" <<YAML
services:
  gitea:
    image: ${GITEA_IMAGE}
    ports:
      - "3000:3000"
    environment:
      GITEA__server__ROOT_URL: "${GITEA_URL}/"
      GITEA__server__DOMAIN: "localhost"
      GITEA__security__INSTALL_LOCK: "true"
      GITEA__service__DISABLE_REGISTRATION: "true"
      GITEA__actions__ENABLED: "true"
    volumes:
      - gitea-data:/var/lib/gitea

  runner:
    image: ${RUNNER_IMAGE}
    depends_on:
      - gitea
    environment:
      GITEA_INSTANCE_URL: "${GITEA_INTERNAL_URL}"
      GITEA_RUNNER_REGISTRATION_TOKEN: "\${REGISTRATION_TOKEN}"
      GITEA_RUNNER_EPHEMERAL: "1"
      GITEA_RUNNER_ONCE: "1"
      GITEA_RUNNER_LABELS: "ubuntu-latest:host"
    volumes:
      - act-cache:/root/.cache/act

  cache-exporter:
    image: busybox:1.37.0@sha256:9532d8c39891ca2ecde4d30d7710e01fb739c87a8b9299685c63704296b16028
    command: sh -c 'cd /cache && tar cf - . | tar xf - -C /out'
    volumes:
      - act-cache:/cache:ro
      - ${OUTPUT_DIR_ABS}:/out

volumes:
  gitea-data:
  act-cache:
YAML

compose up --detach gitea

wait_for_gitea

compose exec --user git -T gitea \
  gitea admin user create \
    --username "${ADMIN_USER}" \
    --password "${ADMIN_PASSWORD}" \
    --email "${ADMIN_EMAIL}" \
    --admin \
    --must-change-password=false >/dev/null

api POST /api/v1/orgs "{\"username\":\"${ORG_NAME}\"}" >/dev/null
api POST "/api/v1/orgs/${ORG_NAME}/repos" "{\"name\":\"${REPO_NAME}\",\"auto_init\":false,\"default_branch\":\"main\"}" >/dev/null

mkdir -p "${WORKDIR}/repo/.gitea/workflows"
cp "${WARMUP_WORKFLOW_FILE}" "${WORKDIR}/repo/.gitea/workflows/warmup.yaml"

git -C "${WORKDIR}/repo" init --initial-branch=main >/dev/null
git -C "${WORKDIR}/repo" config user.name "Act cache warmer"
git -C "${WORKDIR}/repo" config user.email "act-cache-warmer@example.com"
git -C "${WORKDIR}/repo" add .gitea/workflows/warmup.yaml
git -C "${WORKDIR}/repo" commit -m "Add act cache warmup workflow" >/dev/null

REGISTRATION_TOKEN="$(api GET "/api/v1/orgs/${ORG_NAME}/actions/runners/registration-token" | jq -r '.token')"
if [[ -z "${REGISTRATION_TOKEN}" || "${REGISTRATION_TOKEN}" == "null" ]]; then
  echo "Failed to read Gitea runner registration token" >&2
  exit 1
fi
export REGISTRATION_TOKEN

compose up --detach runner

git -C "${WORKDIR}/repo" remote add origin "${GITEA_URL}/${ORG_NAME}/${REPO_NAME}.git"
git -C "${WORKDIR}/repo" -c http.extraHeader="Authorization: Basic $(printf '%s:%s' "${ADMIN_USER}" "${ADMIN_PASSWORD}" | base64 -w 0)" push origin main >/dev/null

RUNNER_CONTAINER_ID="$(compose ps --quiet runner)"
RUNNER_EXIT_CODE="$(docker wait "${RUNNER_CONTAINER_ID}")"
compose logs runner

if [[ "${RUNNER_EXIT_CODE}" != "0" ]]; then
  echo "Warm-up workflow failed with runner exit code ${RUNNER_EXIT_CODE}" >&2
  exit "${RUNNER_EXIT_CODE}"
fi

compose run --rm cache-exporter

if [[ -z "$(find "${OUTPUT_DIR}" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo "Warm-up completed, but no act cache files were produced" >&2
  exit 1
fi
