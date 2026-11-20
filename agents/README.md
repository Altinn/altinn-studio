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
LocalTest, browser evidence and computer use. Each Agent's `environment.md` says what is special about it. Both build on the
[agentctl base image](https://github.com/digdir/digdir-agents/tree/main/images/agentctl-base), which provides the
harnesses and the desktop.

## Getting started

1. Install `agentctl` 0.1.0-preview.14 or later and run `agentctl claude login`. If your `agentctl` was installed from
   an altinn-studio release, install it again from digdir-agents to keep receiving updates.
2. Sign in to GitHub and store the keys you have, as [Credentials](#credentials) describes.
3. Run `agentctl tui` from this checkout and press `c` to create an Agent. The footer lists the other keys.

If you used these Agents with a `.env` file before, run `agentctl update` in this checkout once: it stores the file's
values as below and deletes it. Then apply your Agents again, which changes them in place. They get a newer image
only when created again.

## Deployed apps

Agents mount a read-only copy of the apps deployed to production and tt02 under
`/home/agent/code/.reference/altinn-apps`, from the [volumes](_volumes) that
[altinn-fleet](../src/tools/altinn-fleet/README.md) fills on your machine. To create or refresh them:

1. Run `fleet sync --env all`.
2. Apply the volume manifests, with `V` in `agentctl tui`.

An Agent keeps the copy it was created with. Mounts cannot change on an existing Agent, so delete and apply again,
once, an Agent created before they were added.

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

All tokens and keys stay on the host, stored with `agentctl`. The Agent sees placeholders, and they are substituted only
in requests to their own hosts. Only the GitHub login is required.

```sh
agentctl github login default
agentctl secret set azure-devops-pat --hosts dev.azure.com
agentctl secret set studio-prod-api-key --hosts altinn.studio
agentctl secret set studio-staging-api-key --hosts staging.altinn.studio
agentctl secret set studio-dev-api-key --hosts dev.altinn.studio
agentctl secret set aivar-api-key --hosts api.aivar.no
```

- `default` GitHub login: the account the Agent works and commits as. Signing in through the browser works, or give
  a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with `Contents` and
  `Pull requests` read and write. Add `Actions: Read` for CI, `Workflows: Read and write` to change workflow files and
  `Gists: Read and write` for gists.
- `azure-devops-pat`: a [personal access token](https://dev.azure.com/brreg/_usersSettings/tokens) in the `brreg`
  organization with `Code: Read`, or `Code: Read & write` to push.
- `studio-prod-api-key`, `studio-staging-api-key`, `studio-dev-api-key`: Designer API keys. The Agent logs `studioctl`
  in to each configured environment at boot; check with `studioctl auth status`.
- `aivar-api-key`: a key for the aivar gateway (`api.aivar.no`). Pi, which both Agents offer beside Claude Code and
  Codex, needs it to answer.

`agentctl secret list` and `agentctl github list` show what is stored, and name what the Agents ask for that is
missing.
