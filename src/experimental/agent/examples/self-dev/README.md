# Altinn Studio self-development Agent

Prerequisites are Docker, hardware virtualization, and an authenticated Claude Code installation on
the host. Linux requires `/dev/kvm`; macOS requires Apple Silicon; Windows requires the distinct
`HypervisorPlatform` optional feature and Docker Desktop in Linux-container mode.
The example owns its Ubuntu 26.04 LTS multi-platform development-toolchain Dockerfile and uses a direct ext4 root
filesystem so Docker can run inside the Agent without nesting its `overlay2` storage on the Sandbox root OverlayFS.
Its systemd boot unit clones Altinn Studio over mediated HTTPS into `/home/agent/code/altinn-studio`, and the image
declares `/home/agent/code` as the stable Session workspace root so other repositories can live beside that checkout.
The unit skips an existing `.git` checkout and otherwise makes one straightforward clone attempt per boot; it never
updates or deletes workspace data. The backend-neutral Sandbox environment supplies the manifest binding's
`GITHUB_TOKEN` inert value to image init, and the systemd unit passes that environment by name. The Sandbox network
mediator substitutes the host-side value only for the Git request to GitHub. Workspace initialization is intentionally
independent of Agent readiness. The example's `instructions.md` tells the attached Agent to clone a still-missing
checkout.

```sh
agentctl claude login
cp .env.sample .env
# Add a GitHub PAT and Studio bot token to .env without committing it.
agentctl apply -f agent.yaml --name studiodev-0
agentctl get studiodev-0
agentctl attach studiodev-0 s1
agentctl attach studiodev-0 s2
agentctl sessions studiodev-0
```

The first apply includes the image build and can take several minutes. Image init starts one repository clone attempt,
which may still be running when the Agent becomes Ready. Later boots reuse a successful persistent checkout. Sessions
may clone a missing primary checkout or other relevant repositories on demand when the mediated GitHub secret can
access them; those checkouts are Session work, not declarative Agent state.

The Sandbox receives only inert placeholders. `agentd` stores real values in its owner-only SQLite database and the
Microsandbox network mediator substitutes them only at their configured hosts. The image also seeds Claude's mutable
`.claude.json` once to answer first-run prompts. Builders may replace that image seed, or deliberately supply Claude
state or Codex `config.toml` through `spec.home`; files supplied through `spec.home` are desired state and therefore
reapplied on every Agent reconciliation pass. The builder-wide `instructions.md` payload is declared separately through
`spec.instructions`; the Claude adapter installs it as `~/.claude/CLAUDE.md`.
