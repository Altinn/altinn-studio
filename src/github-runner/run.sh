#!/usr/bin/env bash
set -euo pipefail

RUNNER_HOME="${RUNNER_HOME:-/home/runner}"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-${RUNNER_HOME}/_work}"
RUNNER_NAME="${RUNNER_NAME:-$(hostname)}"
RUNNER_SCOPE="${RUNNER_SCOPE:-repo}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted,linux,x64,altinn-studio}"
GITHUB_HOST="${GITHUB_HOST:-github.com}"
GITHUB_SERVER_URL="${GITHUB_SERVER_URL:-https://github.com}"
RUNNER_GROUP="${RUNNER_GROUP:-Default}"

: "${GITHUB_OWNER:?GITHUB_OWNER is required}"
: "${APP_ID:?APP_ID is required}"
: "${APP_PRIVATE_KEY:?APP_PRIVATE_KEY is required}"

APP_PRIVATE_KEY="${APP_PRIVATE_KEY//\\n/$'\n'}"
unset APP_INSTALLATION_ID

if [[ "${GITHUB_HOST}" == "github.com" ]]; then
  GITHUB_API_URL="${GITHUB_API_URL:-https://api.github.com}"
else
  GITHUB_API_URL="${GITHUB_API_URL:-https://${GITHUB_HOST}/api/v3}"
fi

case "${RUNNER_SCOPE}" in
  repo)
    : "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required when RUNNER_SCOPE=repo}"
    registration_url="${GITHUB_API_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/actions/runners/registration-token"
    remove_url="${GITHUB_API_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/actions/runners/remove-token"
    runner_url="${GITHUB_SERVER_URL}/${GITHUB_OWNER}/${GITHUB_REPOSITORY}"
    ;;
  org)
    registration_url="${GITHUB_API_URL}/orgs/${GITHUB_OWNER}/actions/runners/registration-token"
    remove_url="${GITHUB_API_URL}/orgs/${GITHUB_OWNER}/actions/runners/remove-token"
    runner_url="${GITHUB_SERVER_URL}/${GITHUB_OWNER}"
    ;;
  *)
    echo "Unsupported RUNNER_SCOPE=${RUNNER_SCOPE}; expected repo or org" >&2
    exit 1
    ;;
esac

base64url() {
  base64 | tr '+/' '-_' | tr -d '=\n'
}

app_jwt() {
  local now iat exp header payload encoded_header encoded_payload signature
  now="$(date +%s)"
  iat="$((now - 60))"
  exp="$((now + 540))"
  header='{"alg":"RS256","typ":"JWT"}'
  payload="$(jq -cn --argjson iat "${iat}" --argjson exp "${exp}" --argjson iss "${APP_ID}" '{iat:$iat,exp:$exp,iss:$iss}')"
  encoded_header="$(base64url <<<"${header}")"
  encoded_payload="$(base64url <<<"${payload}")"
  signature="$(printf '%s.%s' "${encoded_header}" "${encoded_payload}" | openssl dgst -binary -sha256 -sign <(printf '%s' "${APP_PRIVATE_KEY}") | base64url)"
  printf '%s.%s.%s' "${encoded_header}" "${encoded_payload}" "${signature}"
}

installation_token() {
  local jwt access_token_url
  jwt="$(app_jwt)"
  access_token_url="$(curl -fsSL \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${jwt}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "${GITHUB_API_URL}/app/installations" |
    jq -r --arg owner "${GITHUB_OWNER}" '.[] | select(.account.login == $owner) | .access_tokens_url' |
    head -n 1)"

  if [[ -z "${access_token_url}" || "${access_token_url}" == "null" ]]; then
    echo "GitHub App installation for ${GITHUB_OWNER} was not found" >&2
    exit 1
  fi

  curl -fsSL \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${jwt}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "${access_token_url}" | jq -r '.token'
}

github_api_token="$(installation_token)"
unset APP_ID
unset APP_PRIVATE_KEY

request_token() {
  local url="$1"
  curl -fsSL \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${github_api_token}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "${url}" | jq -r '.token'
}

cleanup() {
  if [[ -f "${RUNNER_HOME}/.runner" ]]; then
    echo "Removing GitHub runner registration"
    remove_token="$(request_token "${remove_url}")"
    "${RUNNER_HOME}/config.sh" remove --token "${remove_token}" || true
  fi
}

trap cleanup EXIT INT TERM

mkdir -p \
  "${RUNNER_WORKDIR}" \
  "${RUNNER_WORKDIR}/_tool" \
  "${RUNNER_HOME}/.cache/go-build" \
  "${RUNNER_HOME}/.cache/yarn" \
  "${RUNNER_HOME}/.nuget/packages" \
  "${RUNNER_HOME}/go/pkg/mod"
cd "${RUNNER_HOME}"

registration_token="$(request_token "${registration_url}")"

"${RUNNER_HOME}/config.sh" \
  --url "${runner_url}" \
  --token "${registration_token}" \
  --name "${RUNNER_NAME}" \
  --work "${RUNNER_WORKDIR}" \
  --labels "${RUNNER_LABELS}" \
  --runnergroup "${RUNNER_GROUP}" \
  --unattended \
  --ephemeral \
  --replace

unset registration_token

"${RUNNER_HOME}/run.sh" &
runner_pid="$!"
wait "${runner_pid}"
