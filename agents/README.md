# Altinn Agents

Choose a Claude Code development environment:

| Variant    | Additional tools                                        |
| ---------- | ------------------------------------------------------- |
| `minimal`  | .NET, Node.js and Go                                    |
| `full`     | Rust, Podman, kind, kubectl, Helm and Flux              |
| `worktree` | Full image with the current checkout mounted read-write |

The host needs hardware virtualization. Docker is required only for manifests that build an image locally; these
released variants use registry references. Install the released Agent CLI on Linux or macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/Altinn/altinn-studio/main/src/experimental/agent/install.sh | sh
agentctl claude login
```

Windows additionally requires the `HypervisorPlatform` optional feature. Install from PowerShell:

```powershell
irm https://raw.githubusercontent.com/Altinn/altinn-studio/main/src/experimental/agent/install.ps1 | iex
```

Open a new PowerShell window so the updated user `PATH` takes effect, then authenticate:

```powershell
agentctl claude login
```

## GitHub token

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
for the repositories the Agent will use. Grant `Contents: Read and write` and
`Pull requests: Read and write`; add `Actions: Read` for CI inspection and `Workflows: Read and
write` only when the Agent must change workflow files. Gists are an account permission rather than a
repository one, so add `Gists: Read and write` when the Agent must create or push them.
Organization approval may be required.

Copy the chosen variant's `.env.sample` to `.env` and set `GITHUB_TOKEN` there. The token remains
on the host and is substituted only for authorized GitHub requests. The worktree variant does not
receive a token because its host checkout is mounted into the Agent.

From the repository root, configure and start an Agent:

```sh
cd agents/full
cp .env.sample .env
$EDITOR .env
agentctl apply -f agent.yaml
agentctl wait agent/altinn-full --for condition=Ready --timeout 10m
```

Use `agents/minimal` and `agent/altinn-minimal` instead for the minimal variant.

To work directly on the current checkout without cloning it, apply `agents/worktree/agent.yaml` from
the repository root. The entire checkout, including ignored files, is then visible inside the Agent. Linked Git
worktrees also need their external common Git directory mounted for Git commands to work inside the Agent.

Create or reattach to a Session:

```sh
agentctl attach session/work
```

Detach with `Ctrl-b d`. Sessions open in `/home/agent/code`.

Delete the Agent and its Sandbox:

```sh
agentctl delete agent/altinn-full
```
