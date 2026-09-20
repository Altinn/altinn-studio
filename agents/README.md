# Altinn Agents

Choose an Agent and, optionally, a variant:

| Agent / variant          | Image and checkout                                                   |
| ------------------------ | -------------------------------------------------------------------- |
| `minimal` default        | Minimal published image and a fresh checkout                         |
| `minimal` `nested`       | Minimal published image, reduced to fit inside another Agent         |
| `minimal` `nested-build` | Reduced resources and a minimal image built from this checkout       |
| `minimal` `worktree`     | Minimal published image with the current checkout mounted read-write |
| `full` default           | Full published image and a fresh checkout                            |
| `full` `nested`          | Full published image, reduced to fit inside another Agent            |
| `full` `nested-build`    | Reduced resources and a full image built from this checkout          |
| `full` `worktree`        | Full published image with the current checkout mounted read-write    |
| `desktop` default        | Full image plus a graphical desktop, and a fresh checkout            |
| `desktop` `nested`       | Desktop published image, reduced to fit inside another Agent         |
| `desktop` `nested-build` | Reduced resources and a desktop image built from this checkout       |
| `desktop` `worktree`     | Desktop published image with the current checkout mounted read-write |

Install the released Agent CLI on Linux or macOS:

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

## Host credentials

### GitHub token

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
for the repositories the Agent will use. Grant `Contents: Read and write` and
`Pull requests: Read and write`; add `Actions: Read` for CI inspection and `Workflows: Read and
write` only when the Agent must change workflow files. Gists are an account permission rather than a
repository one, so add `Gists: Read and write` when the Agent must create or push them.
Organization approval may be required.

Copy the chosen Agent's `.env.sample` to `.env`, set the sample Git identity, and set the credential variables the
Agent needs. The selected Git identity enters the Sandbox in plaintext and configures the Sandbox user's global Git
settings. The GitHub token remains on the host and is substituted only for authorized requests, including attachment
uploads to `uploads.github.com`. Inside the Agent the variable holds an inert placeholder with the fine-grained token
prefix, which `gh` needs before it will attach files.

### Azure DevOps personal access token

Create a PAT in the [`brreg` Azure DevOps organization](https://dev.azure.com/brreg/_usersSettings/tokens):

1. Select **New Token**, give it a recognizable name, select the `brreg` organization, and choose a short expiration.
2. Select **Custom defined**, then grant **Code: Read** to clone and fetch. Grant **Code: Read & write** only if the
   Agent must push branches.
3. Create and immediately copy the token; Azure DevOps does not show it again.

Set `AZURE_DEVOPS_PAT` in the chosen Agent's `.env`. The PAT remains on the host. The Sandbox receives an inert
placeholder, and network mediation substitutes the PAT only in requests to `dev.azure.com`.

### Altinn Studio API keys

Set any of `STUDIO_PROD_API_KEY`, `STUDIO_STAGING_API_KEY`, and `STUDIO_DEV_API_KEY` to an existing Designer API key
for the user the Agent should use in that environment. At boot, the Agent imports and validates every configured key
with `studioctl`; missing or empty keys are ignored. Like the GitHub token, the API keys remain on the host: the
Sandbox and its persisted `studioctl` credentials contain only inert placeholders, and each key can be substituted
only in requests to its matching Studio host.

After the Agent is Ready, verify the configured logins from a Session or over SSH:

```sh
studioctl auth status --json
```

From the repository root, configure and start an Agent:

```sh
cd agents/full
cp .env.sample .env
$EDITOR .env
agentctl apply --wait
```

`--wait` streams provisioning progress and returns once the Agent is Ready. Without it `apply`
returns immediately and `agentctl wait agent/altinn-full` follows the same progress later.

Use `agents/minimal` and `agent/altinn-minimal` for the minimal Agent, and `agents/desktop` and
`agent/altinn-desktop` for the desktop one. From any Agent directory, select a
repository-owned variant with `agentctl apply --variant nested`, `--variant nested-build`, or `--variant worktree`.

To work directly on the current checkout without cloning it, create `~/.agent/altinn-worktree.env` outside the
checkout with entries such as `GIT_USER_NAME=Your Name` and `GIT_USER_EMAIL=you@example.com`, then apply from the
repository root:

```sh
cd agents/full
agentctl apply --variant worktree --env-file ~/.agent/altinn-worktree.env
```

The entire checkout, including ignored files, is then visible inside the Agent. Linked Git
worktrees also need their external common Git directory mounted for Git commands to work inside the Agent.

`agentctl apply` rejects a worktree whose checkout contains a `.env` file, regardless of casing or ignore rules. Keep
secret files outside the checkout and select one with `--env-file <path>`.

Create or reattach to a Session:

```sh
agentctl attach session/work
```

Detach with `Ctrl-b d`. Sessions open in `/home/agent/code`.

Delete a Session when its work is done; its name becomes free again:

```sh
agentctl delete session/work
```

Archive a Session to put it away; it keeps its name and conversation, and attaching after unarchiving resumes it:

```sh
agentctl archive session/work
agentctl unarchive session/work
```

A new Session launches with the model and effort level declared by its harness installation's manifest `defaults`;
the published manifests select Claude Code's `fable` alias. Choose differently for one Session, in the harness's own
vocabulary; the choice is fixed for that Session:

```sh
agentctl create session/careful --model opus --effort xhigh
```

## SSH access

All published variants declare `access: [{type: ssh}]`, so an editor or `sftp` can reach the Agent's Sandbox as the
user `agent`. Open a shell or run one command:

```sh
agentctl ssh agent/altinn-full
agentctl ssh agent/altinn-full -- uptime
```

The Agent's SSH server listens only inside the Sandbox; `agentctl` generates an OpenSSH client configuration at
`~/.agent/ssh/config` that reaches it through `agentctl ssh-proxy`, with the Agent's host key already trusted. Include
that configuration from your own `~/.ssh/config` once, then use the alias `agentctl-<name>` with any OpenSSH
client, including remote-development features of editors that read OpenSSH configuration:

```sh
agentctl ssh-config install
ssh agentctl-altinn-full
sftp agentctl-altinn-full
```

`agentctl ssh-info agent/altinn-full -o json` prints the alias, key paths and proxy command for tools that want
them directly. The `agent` user has passwordless `sudo`, so an SSH login is as powerful as a Session; the server's
hardening is hygiene, and the Sandbox remains the boundary. SSH access needs an image whose init is systemd, as the
published images are, with OpenSSH installed and a usable `agent` account. `agentd` owns the loopback-only server
policy and systemd unit. An Agent created from an image older than this feature reports that its image cannot provide
SSH access; delete it and re-apply to pick up the current image.

## Desktop access

The `desktop` Agent runs a graphical desktop on display `:1` at 1456x819: an X server that is also
a VNC server, the openbox window manager, a panel, and the same Chromium the Agent's Playwright
tooling uses. The Agent drives it with the `desktop` helper and its `computer-use` skill; a person
watches or takes over over VNC.

The desktop publishes itself on a Unix socket inside the Sandbox and opens no port of its own. The
image also ships the units that bridge a port to it and serve it in a browser, disabled; the
platform turns them on when the Agent declares the capability, and off when it stops:

```yaml
  access:
    - type: ssh
    - type: vnc
```

The published `desktop` variants declare both. Remove the `vnc` entry and re-apply and the Agent
keeps its screen with nothing listening — `agentd` checks that rather than assuming it, and reports
an image that is still publishing the desktop outside its access units.

In a browser, with nothing to install:

```sh
agentctl vnc --web --open agent/altinn-desktop
```

Or with a VNC client of your own:

```sh
agentctl vnc agent/altinn-desktop
vncviewer 127.0.0.1:5900
```

Both hold the forward open until interrupted. `--port` picks a different local port, and
`agentctl vnc-info agent/altinn-desktop -o json` prints the ports for tooling that wants them
directly. Which viewer the browser gets, and at what URL, is the image's to decide: `--web`
forwards the port and opens its root. The forward carries an unauthenticated RFB stream, which is safe for the same
reason the Agent's other loopback ports are: it never leaves the Sandbox except through the
forward you just opened. You share the Agent's keyboard and pointer, so agree with it about who is
driving before you start clicking.

An Agent created from an image older than this feature reports that its image cannot provide VNC
access; delete it and re-apply to pick up the current image.

Delete the Agent and its Sandbox:

```sh
agentctl delete agent/altinn-full
```
