# Altinn Agents

Choose one of two Claude Code development environments:

| Variant | Additional tools |
| --- | --- |
| `minimal` | .NET, Node.js and Go |
| `full` | Rust, Podman, kind, kubectl, Helm and Flux |

Install the released Agent CLI:

```sh
curl -fsSL https://raw.githubusercontent.com/Altinn/altinn-studio/main/src/experimental/agent/install.sh | sh
agentctl claude login
```

From the repository root, configure and start an Agent:

```sh
cd agents/full
cp .env.sample .env
$EDITOR .env
agentctl apply -f agent.yaml
agentctl wait agent/altinn-full --for condition=Ready --timeout 10m
```

Use `agents/minimal` and `agent/altinn-minimal` instead for the minimal variant.

Create or reattach to a Session:

```sh
agentctl attach session/work
```

Detach with `Ctrl-b d`. Sessions open in `/home/agent/code`.

Delete the Agent and its Sandbox:

```sh
agentctl delete agent/altinn-full
```
