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
| `full` default           | Full published image and a fresh checkout                            |
| `full` `nested`          | Full published image, reduced to fit inside another Agent            |
| `full` `nested-build`    | Reduced resources and a full image built from this checkout          |
| `full` `worktree`        | Full published image with the current checkout mounted read-write    |
| `desktop` default        | Full image plus a graphical desktop, and a fresh checkout            |
| `desktop` `nested`       | Desktop published image, reduced to fit inside another Agent         |
| `desktop` `nested-build` | Reduced resources and a desktop image built from this checkout       |
| `desktop` `worktree`     | Desktop published image with the current checkout mounted read-write |

## Getting started

1. Install `agentctl` and run `agentctl claude login`. If your `agentctl` was installed from an altinn-studio
   release, install it again from digdir-agents to keep receiving updates.
2. Copy the chosen Agent's `.env.sample` to `.env` and fill it in (see [Credentials](#credentials)).
3. Run `agentctl tui` from this checkout and press `c` to create an Agent: pick the Agent and variant, and it
   provisions it. Press `n` for a new Session and `o` to open the Agent in a shell, an editor or, for `desktop`, a
   VNC viewer.

The `worktree` variants mount this checkout into the Agent, and `agentctl` rejects a checkout that contains a `.env`
file. Keep that variant's env file outside the checkout, for example `~/.agent/altinn-worktree.env`, and select it in
the create form.

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
