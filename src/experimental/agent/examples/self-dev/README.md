# Altinn Studio self-development Agent

Prerequisites are Docker, hardware virtualization, and an authenticated Claude Code installation on
the host. Linux requires `/dev/kvm`; macOS requires Apple Silicon; Windows requires the distinct
`HypervisorPlatform` optional feature and Docker Desktop in Linux-container mode.
The example owns its Ubuntu 26.04 LTS multi-platform development-toolchain Dockerfile and uses a direct ext4 root
filesystem so Docker can run inside the Agent without nesting its `overlay2` storage on the Sandbox root OverlayFS.
Its systemd boot unit clones Altinn Studio over mediated HTTPS into `/home/agent/code/altinn-studio`, and the image
declares `/home/agent/code` as the stable Session workspace root so other repositories can live beside that checkout.
The unit skips an existing `.git` checkout and otherwise makes one straightforward clone attempt per boot; it never
updates or deletes workspace data. The Sandbox network mediator is running before the image init system starts, so Git
uses the manifest's `github-token` placeholder while the real `GITHUB_TOKEN` remains host-side. The image's
`agent-image-ready` executable waits for that one attempt to finish before harness setup, but a failed clone does not
keep the Agent NotReady. The example's `AGENTS.md` tells the attached Agent to clone a still-missing checkout.

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

The first apply includes the image build and one repository clone attempt and can take several minutes. Later boots
reuse a successful persistent checkout. Sessions may clone a missing primary checkout or other relevant repositories
on demand when the mediated GitHub credential can access them; those checkouts are Session work, not declarative Agent
state.

The Sandbox receives only inert placeholders. `agentd` stores real values in its owner-only SQLite database and the
Microsandbox network mediator substitutes them only at their configured hosts. The image also seeds Claude's mutable
`.claude.json` once to answer first-run prompts. Builders may replace that image seed, or deliberately supply Claude
state or Codex `config.toml` through `spec.home`; files supplied through `spec.home` are desired state and therefore
reapplied on every Agent reconciliation pass.
