# Agent platform self-development Agent

Agents for working on the agent platform itself: the crates under `src/experimental`, `agentd` and `agentctl`.
For Agents that work on Altinn Studio and its apps, use the published variants under [`agents/`](../../../../../agents).

| Variant    | Checkout                                                       | Size                 |
| ---------- | -------------------------------------------------------------- | -------------------- |
| `worktree` | The current host checkout bind-mounted read-write              | 4 CPU, 8Gi, 64Gi     |
| `checkout` | A fresh clone of `Altinn/altinn-studio` made once at boot      | 4 CPU, 8Gi, 64Gi     |
| `nested`   | Like `checkout`, sized to run inside another self-dev Agent    | 2 CPU, 3Gi, 16Gi     |

All three build the same image from the shared `Dockerfile`: the Rust toolchain pinned in the root `Cargo.toml` with
clippy, rustfmt and `cargo-machete`, `libcap-ng-dev` for the Microsandbox runtime, Podman with the `docker` shim, the
GitHub CLI, and the Claude Code and Codex CLIs. The Studio toolchains that `agents/` provides are deliberately absent.
Harness versions are image-owned, so a version bump in the Dockerfile needs no manifest change.

Prerequisites are Docker, hardware virtualization and an authenticated Claude Code subscription on the host. Linux
requires `/dev/kvm`; macOS requires Apple Silicon; Windows requires the `HypervisorPlatform` optional feature and
Docker Desktop in Linux-container mode. Apply a variant with the `agentctl` built from the same checkout:

```sh
make -C src/experimental user-install
agentctl claude login
agentctl codex login                                  # optional
cd src/experimental/agent/examples/self-dev/checkout
cp .env.sample .env                                   # add a GitHub PAT without committing it
agentctl apply -f agent.yaml
agentctl wait --for=condition=Ready agent/agent-dev --timeout=15m
agentctl attach session/s1
agentctl attach session/s2 --harness codex
agentctl exec -- make -C altinn-studio/src/experimental build
```

The first apply builds the image and takes several minutes. When exactly one Agent was applied from a variant
directory, `exec` and Session commands infer it; pass `--name` to `apply` to run several. The image is fixed for an
Agent incarnation and a Dockerfile edit does not change the manifest, so rebuild with `agentctl delete` followed by
`agentctl apply`.

## Worktree variant and secret files

The worktree variant mounts the whole checkout, including ignored files, so a `.env` anywhere inside it would hand
real secret values to the Sandbox. `agentctl apply` refuses a bind mount whose source contains the secret file of any
active Agent. Keep the worktree variant's secret file outside the checkout:

```sh
cd src/experimental/agent/examples/self-dev/worktree
agentctl apply -f agent.yaml --env-file ~/.agent/self-dev.env
```

Edits made by the Agent appear in the host working tree at once and host edits appear in the Sandbox. Linked Git
worktrees also need their common Git directory mounted for Git commands to work inside the Sandbox. Cargo's registry
and build output stay on the Sandbox's own root filesystem so host and Sandbox builds do not invalidate each other.

## Running the platform nested

The Sandbox exposes `/dev/kvm` and a Podman socket, so the Agent can run the whole platform: `make test-e2e`, and
`make user-install` followed by `agentctl apply` of the `nested` variant. The nested `agentd` reaches Podman's Docker
Engine API through `DOCKER_HOST`. Nested Sandboxes share the outer Sandbox's mediated network and receive no real
secrets either.

Nested harness login chains the mediated placeholders: `agentctl claude login --from-stdin` accepts the outer
Sandbox's `CLAUDE_CODE_OAUTH_TOKEN` placeholder, validates it through the outer mediator, and stores it as the nested
"secret". The nested Sandbox then receives a placeholder of its own, and each mediator rewrites one level on the way
out. The same works for `GITHUB_TOKEN` in the nested secret file, and for Codex through
`agentctl codex login --from-stdin < ~/.codex/auth.json`: the nested `agentd` recognizes the placeholder
`auth.json`, stores it verbatim as a mediated credential and never refreshes it. `instructions.md` spells the steps
out for the Agent.

## Mediation

The Sandbox receives only inert placeholders. `agentd` stores real values in its owner-only SQLite database and the
network mediator substitutes them only at their configured hosts. The image seeds Claude's mutable `.claude.json`
once to answer first-run prompts; files under a variant's `home/` are desired state and are reapplied on every
reconciliation pass. `instructions.md` is installed as `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`.
