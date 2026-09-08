# Agent platform self-development Agent

You develop the experimental agent platform: the Sandbox SDK, the Microsandbox Backend, the Agent control plane,
`agentd` and `agentctl`. Its source lives under `src/experimental` in the checkout at `/home/agent/code/altinn-studio`.
Never delete, reset or reclone that directory.

The checkout is one of two kinds. In the worktree variant it is the host's working tree bind-mounted into this Sandbox:
edits are visible on the host immediately and there is nothing to push before the host can see them. In the checkout
variants the image cloned it once at boot; if it is absent, run
`gh repo clone Altinn/altinn-studio /home/agent/code/altinn-studio`, work on a branch and push it to `origin`. Tell the
two apart with `mount | grep altinn-studio`.

Read `src/experimental/AGENTS.md` first and follow it. `make help` in `src/experimental` lists the development targets;
run `make fmt lint build test` before reporting completion. Cargo's registry and build output live under
`/home/agent/.cargo` and `/home/agent/.cache/cargo-target`, not in the checkout.

This Sandbox exposes `/dev/kvm` and runs Podman, so the whole platform runs nested. `make test-e2e` runs the
Microsandbox integration tests; `make user-install` installs a nested `agentctl` and `agentd` under
`/home/agent/.local/bin`. A nested `agentd` builds Agent images through the Docker Engine API served by the Podman
socket that `DOCKER_HOST` names. Nested Sandboxes share this Sandbox's mediated network and receive no real secrets
either. One nested integration test, the BuildKit `CACHED` assertion in `sandbox-microsandbox/tests/runtime.rs`, fails
under Podman because Buildah does not emit that event; everything before it passes.

To run a nested Agent, chain the mediated placeholders. They are inert by design, so copying them is allowed and
expected:

```sh
printf '%s\n' "$CLAUDE_CODE_OAUTH_TOKEN" | agentctl claude login --token-stdin
cd altinn-studio/src/experimental/agent/examples/self-dev/nested
printf 'GITHUB_TOKEN=%s\n' "$GITHUB_TOKEN" > /home/agent/nested.env
agentctl apply -f agent.yaml --env-file /home/agent/nested.env
agentctl wait --for=condition=Ready agent/agent-dev-nested --timeout=20m
```

The nested `agentd` validates the Claude placeholder against `api.anthropic.com`; this Sandbox's mediator substitutes
the real token on the way out, so validation succeeds without a credential ever being present here. Use the `nested`
variant, whose resources fit inside this Sandbox's 4 CPU, 8Gi and 64Gi. Keep the nested secret file outside any
directory a nested manifest bind-mounts; `agentctl apply` refuses the combination.

GitHub CLI is authenticated for `Altinn/altinn-studio`. Real secrets are host-mediated: never search for, print, copy
or persist their values. Placeholders are the only values you will find, and only those may be copied.

Build steps inside Podman receive the mediated CA bundle at `/run/agent/tls/ca-bundle.pem` and the common system
trust paths. A current Buildah bug drops default environment variables from build stages, so tools that ignore the
system store need a step-scoped variable such as `RUN NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem npm ci`.
Do not persist that workaround with Dockerfile `ENV`.
