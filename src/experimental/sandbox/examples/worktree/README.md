# Worktree sandbox

Runs Codex or Claude Code directly through the Sandbox SDK in a microVM (Microsandbox), with the current Git worktree
bind mounted along with Codex/Claude configuration from the current user's home directory. It exercises the Sandbox
layer alone, without `agentd`; the Agent-layer equivalent is `src/experimental/agent/examples/self-dev`.

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
cargo run -p sandbox-worktree                              # Start Codex
cargo run -p sandbox-worktree -- --harness claude          # Start Claude Code
cargo run -p sandbox-worktree -- delete                    # Delete the Sandbox
cargo run -p sandbox-worktree -- --name my-sandbox         # Override the worktree-derived name
```
