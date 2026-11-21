#!/usr/bin/env bash
# Tests the guest image and the operator runner in a real microVM, with the restrictions of the run pod. It needs
# Docker, /dev/kvm and sudo. It removes the containers of a previous test, and keeps its own for the log.
set -euo pipefail
shopt -s inherit_errexit
cd "$(dirname "$0")/../../.."
work="$(mktemp -d)"
docker rm -f registry operator-runner > /dev/null 2>&1 || true

# In a cluster, the PodTemplate sets these values. The core operator sends each run the runTimeout of its kind.
export REGISTRY=localhost:5000 OPERATOR_RUNNER_IMAGE=operator-runner:ci OPERATOR_RUNNER_URL=http://127.0.0.1:8080
export SANDBOX_CPUS=1 SANDBOX_MEMORY=2Gi SANDBOX_ROOT_FILESYSTEM=20Gi RUN_TIMEOUT_SECONDS=780
export REQUEST_TIMEOUT_SECONDS=120 RESULT_RETENTION_SECONDS=300 RESULT_GRACE_SECONDS=30

# The export of the prepared image reads from a registry. A local registry needs no credentials and publishes nothing.
docker run --detach --name registry --publish 127.0.0.1:5000:5000 \
  registry:3.1.2@sha256:ddf754342cfc8acc51a56d5d0ab6af06826461864460636d8bd5c546dab2a7b8
docker build -t "${REGISTRY}/operator-runner-guest:ci" -f src/core/operator-runner/Dockerfile.guest src/core/operator-runner
docker push "${REGISTRY}/operator-runner-guest:ci"
SANDBOX_IMAGE="$(docker inspect --format '{{index .RepoDigests 0}}' "${REGISTRY}/operator-runner-guest:ci")"
export SANDBOX_IMAGE
docker build -t "${OPERATOR_RUNNER_IMAGE}" -f src/core/operator-runner/Dockerfile .

# Export and import the prepared guest image, as the deploy and the init container do. The import runs as the pod does
# on a sandbox node: root owns the hostPath folders, and root has no capabilities. The Microsandbox configuration of the
# export allows plain HTTP to the local registry.
mkdir -p "${work}"/{prepared,export-cache,export-home/runtime,cache,home}
sudo chown 0:0 "${work}"/{cache,home}
echo "{\"registries\":{\"hosts\":{\"${REGISTRY}\":{\"insecure\":true}}}}" > "${work}/export-home/runtime/config.json"
docker run --rm --network host --entrypoint /usr/local/bin/sandbox-image \
  --env SANDBOX_PROVIDER_HOME=/provider --env SANDBOX_CACHE_HOME=/cache \
  --env PREPARED_IMAGE_DIRECTORY=/output --env SANDBOX_IMAGE \
  --volume "${work}/export-home:/provider" \
  --volume "${work}/export-cache:/cache" --volume "${work}/prepared:/output" \
  "${OPERATOR_RUNNER_IMAGE}" export
docker run --rm --entrypoint /usr/local/bin/sandbox-image \
  --env SANDBOX_PROVIDER_HOME=/tmp/sandbox-provider --env SANDBOX_CACHE_HOME=/cache \
  --env PREPARED_IMAGE_DIRECTORY=/prepared --env SANDBOX_IMAGE \
  --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges \
  --volume "${work}/cache:/cache" --volume "${work}/prepared:/prepared:ro" \
  "${OPERATOR_RUNNER_IMAGE}" import

# Starts the operator runner with the restrictions of the pod: root without capabilities, a read-only root file system
# and /dev/kvm.
start_operator_runner() {
  docker run --detach --name operator-runner --publish 127.0.0.1:8080:8080 \
    --device /dev/kvm --cap-drop ALL --security-opt no-new-privileges --read-only --tmpfs /tmp \
    --volume "${work}/home:/var/lib/altinn/sandbox-provider" \
    --volume "${work}/cache:/var/cache/altinn/sandbox" \
    --env SANDBOX_IMAGE --env SANDBOX_CPUS --env SANDBOX_MEMORY --env SANDBOX_ROOT_FILESYSTEM \
    --env REQUEST_TIMEOUT_SECONDS --env RESULT_RETENTION_SECONDS --env RESULT_GRACE_SECONDS "${OPERATOR_RUNNER_IMAGE}"
  for _ in $(seq 1 60); do
    curl -fsS "${OPERATOR_RUNNER_URL}/health" && return 0
    sleep 1
  done
  return 1
}

# Usage: start_run <run id> <archive>. Prints the status of the run.
start_run() {
  local answer status
  answer="$(mktemp)"
  status="$(curl -sS --max-time 180 -o "${answer}" -w '%{http_code}' -X PUT \
    -H 'Content-Type: application/gzip' --data-binary "@$2" \
    "${OPERATOR_RUNNER_URL}/runs/$1?command=upgrade-v9&timeout=${RUN_TIMEOUT_SECONDS}")"
  if [ "${status}" != 202 ] || ! jq -e --arg run_id "$1" '.runId == $run_id' "${answer}" > /dev/null; then
    echo "The operator runner answered ${status}: $(cat "${answer}")" >&2
    return 1
  fi
  jq -r .status "${answer}"
}

# Usage: fetch_result <run id> <result file>. The result comes at most a minute after the timeout of the run, while the
# operator runner deletes the VM, and a read waits up to 30 seconds.
fetch_result() {
  local deadline=$((SECONDS + RUN_TIMEOUT_SECONDS + 90))
  while [ "${SECONDS}" -lt "${deadline}" ]; do
    curl -sS --fail-with-body --max-time 60 "${OPERATOR_RUNNER_URL}/runs/$1/result?wait=30" > "$2"
    if [ "$(jq -r .status "$2")" != running ]; then
      return 0
    fi
  done
  echo "The run did not end in time." >&2
  return 1
}

# Upgrade the v8 template in a microVM, check the exit, and build the result.
start_operator_runner
tar -czf "${work}/app.tar.gz" -C src/App/template/v8/src .
run_id="$(cat /proc/sys/kernel/random/uuid)"
test "$(start_run "${run_id}" "${work}/app.tar.gz")" = running
# A repeat of the same run answers with its status, as after a restart of the operator.
start_run "${run_id}" "${work}/app.tar.gz" > /dev/null
fetch_result "${run_id}" "${work}/result.json"
jq -e '.status == "completed" and .exitCode == 0 and (.report | type) == "object" and .patch != null' "${work}/result.json" > /dev/null \
  || { jq 'del(.patch)' "${work}/result.json"; exit 1; }
jq -r .patch "${work}/result.json" | base64 -d > "${work}/changes.patch"
# The operator runner exits with 0 RESULT_GRACE_SECONDS after the first fetch.
test "$(timeout 120 docker wait operator-runner)" = 0
docker rm operator-runner
cp -R src/App/template/v8/src "${work}/app"
git -C "${work}/app" apply "${work}/changes.patch"
docker run --rm -v "${work}/app:/upgraded:ro" "${REGISTRY}/operator-runner-guest:ci" sh -c '
  set -eu
  cp -R /upgraded app
  cd app
  dotnet build App/App.csproj -nologo -v:q --disable-build-servers
'

# Report an archive that does not extract as failed.
start_operator_runner
echo 'not a tar file' | gzip > "${work}/broken.tar.gz"
run_id="$(cat /proc/sys/kernel/random/uuid)"
start_run "${run_id}" "${work}/broken.tar.gz" > /dev/null
fetch_result "${run_id}" "${work}/broken.json"
jq -e '.status == "failed" and (.error | startswith("The archive does not extract"))' "${work}/broken.json" > /dev/null \
  || { cat "${work}/broken.json"; exit 1; }
test "$(timeout 120 docker wait operator-runner)" = 0
docker rm operator-runner

# Exit when no run comes.
(REQUEST_TIMEOUT_SECONDS=5 && start_operator_runner)
test "$(timeout 60 docker wait operator-runner)" = 0
docker rm operator-runner

# Exit with 143 on SIGTERM.
start_operator_runner
docker stop --time 60 operator-runner
test "$(docker inspect --format '{{.State.ExitCode}}' operator-runner)" = 143
docker rm operator-runner
