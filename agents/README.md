# Altinn Agents

Choose a Claude Code development environment:

| Variant    | Additional tools                                                   |
| ---------- | ------------------------------------------------------------------ |
| `minimal`  | .NET, Node.js, Go, GitHub CLI, asciinema and agg                   |
| `full`     | Rust, Podman, kind, kubectl, Helm, Flux, Playwright CLI and ffmpeg |
| `worktree` | Full image with the current checkout mounted read-write            |

Every variant installs the `pr-evidence` skill from `agents/skills`: screenshots and clips through Playwright, terminal
recordings through asciinema, uploaded with `gh pr create --attach`.

The host needs hardware virtualization. Docker is required only for manifests that build an image locally; these
released variants use registry references. Install the released Agent CLI on Linux or macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/Altinn/altinn-studio/main/src/experimental/agent/install.sh | sh
agentctl claude login
```

Update Agent with:

```sh
agentctl self update
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

Copy the chosen variant's `.env.sample` to `.env`, set the sample Git identity, and set `GITHUB_TOKEN`. The selected
Git identity enters the Sandbox in plaintext and configures the Sandbox user's global Git settings. The token remains
on the host and is substituted only for authorized GitHub requests, including attachment uploads to
`uploads.github.com`. Inside the Agent the variable holds an inert placeholder with the fine-grained
token prefix, which `gh` needs before it will attach files. The worktree variant does not receive a
token because its host checkout is mounted into the Agent, so it cannot attach files to pull requests.

From the repository root, configure and start an Agent:

```sh
cd agents/full
cp .env.sample .env
$EDITOR .env
agentctl apply -f agent.yaml --wait
```

`--wait` streams provisioning progress and returns once the Agent is Ready. Without it `apply`
returns immediately and `agentctl wait agent/altinn-full` follows the same progress later.

Use `agents/minimal` and `agent/altinn-minimal` instead for the minimal variant.

To work directly on the current checkout without cloning it, create `~/.agent/altinn-worktree.env` outside the
checkout with entries such as `GIT_USER_NAME=Your Name` and `GIT_USER_EMAIL=you@example.com`, then apply from the
repository root:

```sh
agentctl apply -f agents/worktree/agent.yaml --env-file ~/.agent/altinn-worktree.env
```

The entire checkout, including ignored files, is then visible inside the Agent. Linked Git
worktrees also need their external common Git directory mounted for Git commands to work inside the Agent.

A `.env` inside the mounted checkout would be readable from the Agent, so `agentctl apply` rejects the worktree
variant while any `.env` of another Agent, for example `agents/full/.env`, lies inside the checkout. Keep such
secret files outside the checkout and pass their location with `agentctl apply --env-file <path>`.

Create or reattach to a Session:

```sh
agentctl attach session/work
```

Detach with `Ctrl-b d`. Sessions open in `/home/agent/code`.

A new Session launches with the model and effort level declared by its harness installation's manifest `defaults`;
the published manifests select Claude Code's `fable` alias. Choose differently for one Session, in the harness's own
vocabulary; the choice is fixed for that Session:

```sh
agentctl create session/careful --model opus --effort xhigh
```

## SSH access

All published variants declare `access: [{type: ssh}]`, so an editor, `sftp` or `rsync` can reach the Agent's Sandbox as the
user `agent`. Open a shell or run one command:

```sh
agentctl ssh agent/altinn-full
agentctl ssh agent/altinn-full -- uptime
```

The Agent's SSH server listens only inside the Sandbox; `agentctl` generates an OpenSSH client configuration at
`~/.agent/ssh/config` that reaches it through `agentctl ssh-proxy`, with the Agent's host key already trusted. Include
that configuration from your own `~/.ssh/config` once, then use the alias `altinn-agent-<name>` with any OpenSSH
client, including remote-development features of editors that read OpenSSH configuration:

```sh
agentctl ssh-config install
ssh altinn-agent-altinn-full
sftp altinn-agent-altinn-full
rsync -av ./fixtures/ altinn-agent-altinn-full:code/fixtures/
```

`agentctl ssh-info agent/altinn-full -o json` prints the alias, key paths and proxy command for tools that want
them directly. The `agent` user has passwordless `sudo`, so an SSH login is as powerful as a Session; the server's
hardening is hygiene, and the Sandbox remains the boundary. SSH access needs an image whose init is systemd, as the
published images are. An Agent created from an image older than this feature reports that its image cannot provide
SSH access; delete it and re-apply to pick up the current image.

Delete the Agent and its Sandbox:

```sh
agentctl delete agent/altinn-full
```
