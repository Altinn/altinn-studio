# Changelog

All notable changes to the experimental Agent platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries should describe only user-facing functionality in clear, user-friendly language; omit implementation details that do not affect how people use the product.
Section ordering: Added, Changed, Fixed, Removed, Security, Deprecated.

The version is the Agent release published by the `experimental-agent/v*` tag, covering `agentctl`, `agentd` and the
Agent images they work with. The Rust workspace version is a build detail and is not tracked here.

## [Unreleased]

### Added

- `agentctl self update` installs a newer release, and `--check` only reports whether one exists. It migrates your Agent state behind a backup, relaunches resumable Sessions, and refuses to run while work is in flight. ([#20397](https://github.com/Altinn/altinn-studio/pull/20397))
- `agentctl apply --wait` stays attached and streams provisioning progress — image pull, build, Sandbox creation, harness setup — until the Agent is Ready. `wait`, `attach` and `exec` show the same progress. ([#20341](https://github.com/Altinn/altinn-studio/pull/20341))
- `agentctl port-forward <agent> [ADDRESS:]LOCAL:GUEST...` forwards local TCP ports into a running Sandbox, and `:GUEST` picks a free local port. In the terminal UI, `f` adds a forward and `F` lists them. ([#20189](https://github.com/Altinn/altinn-studio/pull/20189))
- `agentctl create`, `prompt` (with `--wait`) and `turns` drive a Session from the command line without attaching. Prompt text comes from `--prompt`, `--file` or piped standard input. ([#20374](https://github.com/Altinn/altinn-studio/pull/20374))
- Press `c` in the terminal UI to create an Agent, choosing from the manifests found by walking down from the repository root. ([#20242](https://github.com/Altinn/altinn-studio/pull/20242), [#20358](https://github.com/Altinn/altinn-studio/pull/20358))
- `spec.environment` copies declared non-secret values from the manifest's `.env` into the Sandbox. `GIT_USER_NAME` and `GIT_USER_EMAIL` also set the Sandbox user's global Git identity. ([#20416](https://github.com/Altinn/altinn-studio/pull/20416))
- `spec.skills` installs skill directories into the Sandbox, and `spec.instructions` accepts several sources. The images gain asciinema, agg, ffmpeg and a Playwright CLI, plus a bundled `pr-evidence` skill. ([#20348](https://github.com/Altinn/altinn-studio/pull/20348))
- `agentctl claude login --from-stdin` and `agentctl codex login --from-stdin` take a credential from standard input, so an Agent can log in a nested Agent without ever holding a real one. ([#20339](https://github.com/Altinn/altinn-studio/pull/20339))

### Changed

- **Upgrading from preview 1.** Preview 1 has no `self update`, so upgrade once by re-running `install.sh` or `install.ps1`, which migrates your Agents and stored logins. Use `agentctl self update` from then on. ([#20397](https://github.com/Altinn/altinn-studio/pull/20397))
- **A host release does not change your Sandbox image.** The `agents/` manifests reference `:latest`, and an existing Agent keeps the image it was created with. Delete and re-apply the Agent to pick up a newer one.
- `agentctl` explains failures instead of reporting them bare: the manifest setting at fault, the failing image build step, or the Agent's own reason when a wait times out. ([#20341](https://github.com/Altinn/altinn-studio/pull/20341))
- The hostname inside a Sandbox is the Agent name, so prompts and logs read `agent@<name>`. Existing Sandboxes keep their old hostname until they are recreated. ([#20363](https://github.com/Altinn/altinn-studio/pull/20363))
- `spec.harnesses[].version` is optional: the image owns the harness version, so an image bump needs no manifest change. The `agents/` manifests no longer pin one. ([#20250](https://github.com/Altinn/altinn-studio/pull/20250))
- A Session goes idle after 30 minutes rather than 5, and the timer restarts on activity. Harnesses no longer show their own auto-update prompts. ([#20374](https://github.com/Altinn/altinn-studio/pull/20374))
- Git in the published images authenticates through the `gh` CLI, so `git push` works in a fresh Sandbox without `gh auth setup-git`. The token is also allowed against `gist.github.com`. ([#20151](https://github.com/Altinn/altinn-studio/pull/20151))

### Fixed

- Sessions launch Claude Code on the `fable` alias. Fable never appeared in the `/model` picker, so it could not be selected at all, and a pinned generation would not follow new releases. ([#20147](https://github.com/Altinn/altinn-studio/pull/20147), [#20314](https://github.com/Altinn/altinn-studio/pull/20314))
- Agents start on macOS hosts with long home directory paths, where the Microsandbox control socket could exceed the 104-byte limit on Unix socket paths. ([#20411](https://github.com/Altinn/altinn-studio/pull/20411))
- The first start of an Agent whose image clones a repository no longer fails with `systemd did not finish booting within 90s`; the clone no longer blocks boot. ([#20362](https://github.com/Altinn/altinn-studio/pull/20362))
- Configuring Podman waits for the guest to finish booting, instead of failing once with `System has not been booted with systemd as init system`. ([#20346](https://github.com/Altinn/altinn-studio/pull/20346))
- A forwarded port stays open until both directions close, so a client that half-closes while waiting for the response is no longer cut off. ([#20245](https://github.com/Altinn/altinn-studio/pull/20245))
- Installing on Windows no longer fails while `install.ps1` verifies the downloaded release archive. ([#20143](https://github.com/Altinn/altinn-studio/pull/20143))

## [0.1.0-preview.1] - 2026-08-26

### Added

- First public preview: `agentctl` and `agentd`, declarative Agents with durable tmux-backed Sessions in isolated Sandboxes, mediated harness and GitHub authentication, and the published Agent images.
