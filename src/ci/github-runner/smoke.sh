#!/usr/bin/env bash
# Smoke-tests the toolchains baked into a freshly built runner image.
#
#   docker run --rm --network none --entrypoint bash \
#     --env GO_VERSION --env RUST_VERSION --env CYPRESS_VERSION \
#     -v "$PWD/src/ci/github-runner/smoke.sh:/smoke.sh:ro" <image> /smoke.sh
#
# Runs as the image's `runner` user without network access, so every tool a job
# expects to find baked in must work without downloading anything. The expected
# versions are the build arguments deploy-github-runners.yaml passes.
set -euo pipefail

: "${GO_VERSION:?GO_VERSION is required}"
: "${RUST_VERSION:?RUST_VERSION is required}"
: "${CYPRESS_VERSION:?CYPRESS_VERSION is required}"

fail() { echo "smoke: $*" >&2; exit 1; }

test "$(id -un)" = runner || fail "expected to run as runner, got $(id -un)"
sudo -n true || fail "runner cannot use passwordless sudo, which the entrypoint needs"
test -x /usr/local/bin/altinn-github-runner || fail "the entrypoint is not executable"

echo "## versions"
go version
node --version
yarn --version
dotnet --version
rustc --version
cargo clippy --version
rustfmt --version
cargo machete --version
shellcheck --version | sed -n 2p
google-chrome --version
kubectl version --client
docker --version
docker compose version

go version | grep -Fq " go${GO_VERSION} " || fail "go is not ${GO_VERSION}"
test "$(rustc --version | awk '{ print $2 }')" = "${RUST_VERSION}" || fail "rustc is not ${RUST_VERSION}"
test -x "${CYPRESS_CACHE_FOLDER}/${CYPRESS_VERSION}/Cypress/Cypress" || fail "Cypress ${CYPRESS_VERSION} is not installed"

# Jobs install into and cache under these, so the runner user must own them.
for dir in /opt/tools /opt/corepack /usr/share/dotnet "${HOME}/.cache" "${HOME}/.cargo" \
    "${HOME}/.npm" "${HOME}/.nuget/packages" "${HOME}/.rustup" "${HOME}/go" "${HOME}/_work"; do
    test -w "${dir}" || fail "${dir} is not writable by runner"
done

echo "smoke: ok"
