# Minimal Agent

This manifest-secret-free example exercises the core Agent lifecycle with mediated Claude Code authentication and one
or more persistent tmux sessions. It does not require a `.env` file or expose GitHub and
Altinn Studio secrets to the network mediator. Its small local Dockerfile contains only the tools needed for this
flow on the multi-platform Ubuntu 26.04 LTS base, and its layered root filesystem keeps the smoke-test sandbox
capacity-efficient. Sessions start in the platform's stable `/home/agent/code` workspace root; this example is
intentionally repository-free and uses the
Sandbox Provider's backend init instead of an image entrypoint. A builder that needs a boot-time checkout should use an
image init/entrypoint like the self-development example. Sessions can instead clone repositories on demand when their
Agent declares a suitable mediated secret. It is not intended for running Docker inside the Agent.

```sh
agentctl claude login
agentctl apply -f agent.yaml --name agent-test
agentctl get agent agent-test
agentctl describe agent/agent-test
agentctl wait --for=condition=Ready agent/agent-test --timeout=10m
agentctl exec agent/agent-test -- pwd
agentctl exec -it agent/agent-test -- bash
agentctl attach session/s1 --agent agent-test
agentctl get sessions --agent agent-test
```

When the current directory is inside the source directory of exactly one applied Agent, `agentctl exec -- pwd` and
Session commands infer the Agent; for example, `agentctl attach session/s1` works from this directory after applying
without another Agent name from the same source.

Run these commands from this directory so paths in the manifest resolve against the intended example inputs.
The image seeds Claude's mutable `.claude.json` once for first-run prompts. Configuration intentionally placed in the
`home/` source is reapplied every reconciliation pass instead; that is appropriate for builder-owned declarative files
such as a Codex `config.toml`, and is also available when continuous ownership of Claude state is desired.
The builder-wide `instructions.md` payload is declared through `spec.instructions`; the Claude adapter installs it as
`~/.claude/CLAUDE.md`.
