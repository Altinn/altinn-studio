# Self-development sandbox

Runs Codex or Claude Code in a microVM (Microsandbox),
with the current repository (altinn-studio) bind mounted along with Codex/Claude configuration
from the current users home directory.

Installed tools:

- .NET 10
- Rust
- Go
- nodejs
- container tooling: docker with Buildx, kind, kubectl, flux, helm

This should allow the agent to build and use most/all altinn-studio projects.
Note that though this protects e.g. the host filesystem, it has permissive network access.
Defaults: 4 CPU, 8Gi memory, a 64Gi direct root filesystem and a 4Gi `/tmp`.

Run from `src/experimental`:

```sh
cargo run -p sandbox-self-dev                              # Start Codex
cargo run -p sandbox-self-dev -- --harness claude          # Start Claude Code
cargo run -p sandbox-self-dev -- delete                    # Delete the Sandbox
cargo run -p sandbox-self-dev -- --name my-sandbox         # Override the worktree-derived name
```
