# Altinn Agents

Agents for working on Altinn Studio, run with `agentctl` from [digdir/digdir-agents](https://github.com/digdir/digdir-agents).
See its [README](https://github.com/digdir/digdir-agents/blob/main/agentctl/README.md) for installation and how
`agentctl` works.

| Agent / variant          | Image and checkout                                                   |
| ------------------------ | -------------------------------------------------------------------- |
| `minimal` default        | Minimal published image and a fresh checkout                         |
| `minimal` `nested`       | Minimal published image, reduced to fit inside another Agent         |
| `minimal` `nested-build` | Reduced resources and a minimal image built from this checkout       |
| `minimal` `worktree`     | Minimal published image with the current checkout mounted read-write |
| `desktop` default        | Desktop published image and a fresh checkout                         |
| `desktop` `nested`       | Desktop published image, reduced to fit inside another Agent         |
| `desktop` `nested-build` | Reduced resources and a desktop image built from this checkout       |
| `desktop` `worktree`     | Desktop published image with the current checkout mounted read-write |

`minimal` suits code and review work. `desktop` adds containers, kind, a browser and a graphical desktop, for
LocalTest, browser evidence and computer use. Each Agent's `environment.md` lists its tools. Both build on the
[agentctl base image](https://github.com/digdir/digdir-agents/tree/main/images/agentctl-base), which provides the
harnesses and the desktop.

## Getting started

1. Install `agentctl` 0.1.0-preview.13 or later and run `agentctl claude login`. If your `agentctl` was installed from
   an altinn-studio release, install it again from digdir-agents to keep receiving updates.
2. Copy the chosen Agent's `.env.sample` to `.env` and fill it in (see [Credentials](#credentials)).
3. Run `agentctl tui` from this checkout and press `c` to create an Agent. The footer lists the other keys.

The `worktree` variants mount this checkout into the Agent, and `agentctl` rejects a checkout that contains a `.env`
file. Keep that variant's env file outside the checkout, for example `~/.agent/altinn-worktree.env`, and select it in
the create form.

## External harnesses

You can also work in an Agent's Sandbox from a harness outside `agentctl`, through any app that runs its sessions
on a remote host over SSH. Apps known to work include:

- ChatGPT desktop app
- Claude desktop app
- T3 Code
- VS Code Insiders, in the Agents window

Connect the app to the Agent's SSH alias, `agentctl-<name>`, for example `agentctl-altinn-desktop`. Choose **Set up SSH** in
the TUI's `o` menu once, or run `agentctl ssh-config install`, so OpenSSH resolves the alias; `y` in the same menu
copies it.

## Credentials

All tokens and keys stay on the host. The Agent sees placeholders, and they are substituted only in requests to
their own hosts. `GIT_USER_NAME` and `GIT_USER_EMAIL` enter the Agent in plaintext.

- `GITHUB_TOKEN`: a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with
  `Contents` and `Pull requests` read and write. Add `Actions: Read` for CI, `Workflows: Read and write` to change
  workflow files and `Gists: Read and write` for gists.
- `AZURE_DEVOPS_PAT`: a [personal access token](https://dev.azure.com/brreg/_usersSettings/tokens) in the `brreg`
  organization with `Code: Read`, or `Code: Read & write` to push.
- `STUDIO_PROD_API_KEY`, `STUDIO_STAGING_API_KEY`, `STUDIO_DEV_API_KEY`: Designer API keys. The Agent logs `studioctl`
  in to each configured environment at boot; check with `studioctl auth status`.
- `AIVAR_API_KEY`: a key for the aivar gateway (`api.aivar.no`). Pi, which both Agents offer beside Claude Code and
  Codex, needs it to answer.
