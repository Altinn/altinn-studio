# Altinn Studio self-development Agent

Prerequisites are Docker, hardware virtualization, and authenticated Claude Code and ChatGPT subscriptions on the
host. Linux requires `/dev/kvm`; macOS requires Apple Silicon; Windows requires the distinct
`HypervisorPlatform` optional feature and Docker Desktop in Linux-container mode.
The example owns its Ubuntu 26.04 LTS multi-platform development-toolchain Dockerfile and uses a direct ext4 root
filesystem so Podman's overlay storage does not nest on the Sandbox root OverlayFS.
Its systemd boot unit clones Altinn Studio over mediated HTTPS into `/home/agent/code/altinn-studio`, and the image
declares `/home/agent/code` as the stable Session workspace root so other repositories can live beside that checkout.
The unit uses the preauthenticated GitHub CLI, skips an existing `.git` checkout, and otherwise makes one straightforward
clone attempt per boot; it never updates or deletes workspace data. Workspace initialization is intentionally independent
of Agent readiness. The example's `instructions.md` tells the attached Agent to clone a still-missing checkout.

```sh
agentctl claude login
agentctl codex login
cp .env.sample .env
# Add a GitHub PAT and Studio bot token to .env without committing it.
agentctl apply -f agent.yaml --name studiodev-0
agentctl get agent studiodev-0
agentctl describe agent/studiodev-0
agentctl wait --for=condition=Ready agent/studiodev-0 --timeout=10m
agentctl exec agent/studiodev-0 -- git -C altinn-studio status --short
agentctl exec -it agent/studiodev-0 -- bash
agentctl attach session/s1 --agent studiodev-0
agentctl attach session/s2 --agent studiodev-0 --harness codex
agentctl get sessions --agent studiodev-0
```

When exactly one Agent was applied from the current source directory, `exec` may omit its Agent and Session commands
may omit `--agent`; both infer the owner. Multiple Agent names from the same directory are intentionally ambiguous.

The first apply includes the image build and can take several minutes. Image init starts one repository clone attempt,
which may still be running when the Agent becomes Ready. Later boots reuse a successful persistent checkout. Sessions
may use `gh repo clone` for a missing primary checkout or other relevant repositories; those checkouts are Session work,
not declarative Agent state.

The Sandbox receives only inert placeholders. `agentd` stores real values in its owner-only SQLite database and the
Microsandbox network mediator substitutes them only at their configured hosts. The image also seeds Claude's mutable
`.claude.json` once to answer first-run prompts. Builders may replace that image seed, or deliberately supply Claude
state or Codex `config.toml` through `spec.home`; files supplied through `spec.home` are desired state and therefore
reapplied on every Agent reconciliation pass. The builder-wide `instructions.md` payload is declared separately through
`spec.instructions`; the Claude adapter installs it as `~/.claude/CLAUDE.md`.
The Codex adapter installs the same source as `~/.codex/AGENTS.md`.

Container tooling inside the Agent is Podman. The `podman-docker` package makes the `docker` CLI and
`/run/docker.sock` compatibility surfaces Podman-backed, `podman buildx build` is the buildx-compatible alias, and
`podman-compose` is the Compose provider. Agent commands transparently use the rootful system socket; access to that
socket is root-equivalent inside the Sandbox. Kind remains installed, but `KIND_EXPERIMENTAL_PROVIDER=podman` has not been
verified for this example and its nested-container CA path is out of scope.
