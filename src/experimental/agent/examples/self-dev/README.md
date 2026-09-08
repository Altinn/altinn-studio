# Agent platform self-development Agent

An Agent for working on the agent platform itself: the crates under `src/experimental`, `agentd` and `agentctl`.
For Agents that work on Altinn Studio and its apps, use the published variants under [`agents/`](../../../../../agents).

Prerequisites are Docker, hardware virtualization and an authenticated Claude Code subscription on the host. Linux
requires `/dev/kvm`; macOS requires Apple Silicon; Windows requires the `HypervisorPlatform` optional feature and
Docker Desktop in Linux-container mode. Apply the manifest with the `agentctl` built from the same checkout:

```sh
make -C src/experimental user-install
agentctl claude login
agentctl codex login                      # optional
cd src/experimental/agent/examples/self-dev
cp .env.sample .env                       # add a GitHub PAT without committing it
agentctl apply -f agent.yaml
agentctl wait --for=condition=Ready agent/agent-dev --timeout=15m
agentctl attach session/s1
agentctl attach session/s2 --harness codex
agentctl exec -- make -C altinn-studio/src/experimental build
```

The first apply builds the image and takes several minutes. When exactly one Agent was applied from this directory,
`exec` and Session commands infer it; pass `--name` to `apply` to run several. The image is fixed for an Agent
incarnation and a Dockerfile edit does not change the manifest, so rebuild with `agentctl delete agent/agent-dev`
followed by `agentctl apply`.

## What the Agent gets

The current checkout is bind-mounted read-write at `/home/agent/code/altinn-studio`. Edits made by the Agent appear
in the host working tree at once, and host edits appear in the Sandbox, so review and commit on either side. Linked
Git worktrees also need their common Git directory mounted for Git commands to work inside the Sandbox. Cargo's
registry and build output stay on the Sandbox's own root filesystem so host and Sandbox builds do not invalidate each
other.

The image contains the Rust toolchain pinned in the root `Cargo.toml` with clippy, rustfmt and `cargo-machete`,
Podman with the `docker` compatibility shim, the GitHub CLI, and the Claude Code and Codex CLIs. It deliberately
omits the Studio toolchains (.NET, Node build tooling, Go, Kubernetes) that `agents/` provides.

The Sandbox exposes `/dev/kvm` and a Podman socket, so the Agent can run the whole platform nested: `make test-e2e`
and `make user-install` followed by `agentctl apply` work inside the Sandbox. The nested `agentd` reaches Podman's
Docker Engine API through `DOCKER_HOST` and builds images there. Nested Sandboxes share the outer Sandbox's mediated
network and receive no real secrets either.

The Sandbox receives only inert placeholders. `agentd` stores real values in its owner-only SQLite database and the
network mediator substitutes them only at their configured hosts. The image seeds Claude's mutable `.claude.json`
once to answer first-run prompts; files under `home/` are desired state and are reapplied on every reconciliation
pass. `instructions.md` is installed as `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`.

Harness versions are owned by the image, so a version bump in the Dockerfile needs no manifest change.
