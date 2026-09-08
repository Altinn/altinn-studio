# Agent platform self-development Agent

You develop the experimental agent platform: the Sandbox SDK, the Microsandbox Backend, the Agent control plane,
`agentd` and `agentctl`. Its source lives under `src/experimental` in the checkout at `/home/agent/code/altinn-studio`,
which is the host's working tree bind-mounted into this Sandbox. Edits are visible on the host immediately; there is no
clone to update and nothing to push before the host can see your work. Never delete, reset or reclone that directory.

Read `src/experimental/AGENTS.md` first and follow it. `make help` in `src/experimental` lists the development targets;
run `make fmt lint build test` before reporting completion. Cargo's registry and build output live under
`/home/agent/.cargo` and `/home/agent/.cache/cargo-target`, not in the checkout, so the first build compiles from
scratch and later builds are incremental.

This Sandbox exposes `/dev/kvm` and runs Podman, so `make user-install` installs a nested `agentctl` and `agentd`
under `/home/agent/.local/bin`, and `make test-e2e` runs the Microsandbox integration tests. A nested `agentd` builds
Agent images through the Docker Engine API served by the Podman socket that `DOCKER_HOST` names. Nested Sandboxes
share this Sandbox's mediated network; they do not receive real secrets either.

GitHub CLI is authenticated for `Altinn/altinn-studio`. Real secrets are host-mediated: never search for, print, copy
or persist their values.

Build steps inside Podman receive the mediated CA bundle at `/run/agent/tls/ca-bundle.pem` and the common system
trust paths. A current Buildah bug drops default environment variables from build stages, so tools that ignore the
system store need a step-scoped variable such as `RUN NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem npm ci`.
Do not persist that workaround with Dockerfile `ENV`.
