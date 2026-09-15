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

- `agentctl self update` installs a newer released Agent, and `agentctl self update --check` reports whether one is available without downloading it. The update fetches and verifies the matching `agentctl` and `agentd` packages, stops the daemon, migrates your existing Agent state behind a backup, and relaunches the Sessions that can resume. It refuses to run while an Agent or Session is busy, keeps the previous release until the migration has succeeded, and finishes an interrupted update on the next command you run. This replaces re-running the installer as the way to move between releases.
- `agentctl apply --wait` stays attached and streams provisioning progress until the Agent is Ready or `--timeout` expires, so a cold start shows the image pull with its layer counts, the image build, Sandbox creation and harness setup instead of returning immediately and leaving you to poll. `agentctl wait`, `attach` and `exec` show the same progress while they bring an Agent up.
- `agentctl port-forward <agent> [ADDRESS:]LOCAL:GUEST...` forwards local TCP ports into a running Agent's Sandbox, with no Sandbox configuration and no change to the manifest. Writing `:GUEST` picks a free local port. Forwards live in the `agentctl` process and end when you interrupt it. In the terminal UI, `f` opens a forward form for the selected Agent, `F` lists the active forwards with edit (`e`) and delete (`ctrl-d`), and Agent rows show the mappings that are live.
- Sessions can be driven from the command line, without attaching to a terminal. `agentctl create session/<name>` creates a Session, waits until its harness is ready and optionally hands it a first prompt. `agentctl prompt session/<name>` delivers a prompt to a running Session, and `--wait` blocks until that turn has finished. `agentctl turns session/<name>` prints the conversation as turns, with `--last N` for the tail. Prompt text comes from `--prompt`, from `--file`, or from piped standard input.
- Press `c` in the terminal UI to create an Agent. The form lists the Agent manifests found by walking down from the repository root, or from the current directory when you are not in a repository, so a new Agent can be started without leaving the UI.
- `spec.environment` declares non-secret values to copy into the Sandbox from the same `.env` file the manifest's secrets come from. `name` is both the Sandbox variable and the default entry to read; an optional `source` reads a differently named entry. Only declared values are copied, image init and Executions inherit them, and reapplying after the file changes updates the Sandbox. Declaring `GIT_USER_NAME` and `GIT_USER_EMAIL` this way also sets the Sandbox user's global Git identity, so commits made inside the Agent are attributed to you. Secrets still belong in the manifest's secret bindings, which are never copied in plaintext.
- `spec.skills` installs skill directories into the Sandbox where the harnesses look for them, and `spec.instructions` now accepts several sources instead of one. The published Agent images gain the tools needed to produce evidence for a pull request — asciinema and agg for terminal recordings, ffmpeg and a Playwright browser CLI for screenshots and video — together with a bundled `pr-evidence` skill that records a command and attaches the result to a pull request.
- `agentctl claude login --from-stdin` and `agentctl codex login --from-stdin` store a credential read from standard input instead of signing in interactively. Inside an Agent this accepts the mediated placeholder the Sandbox already holds, so an Agent can log in and run a nested Agent of its own without a real credential ever entering the Sandbox.

### Changed

- **Upgrading from preview 1.** Preview 1 has no `agentctl self update`, so upgrade to this release once by re-running the installer — `install.sh` on Linux and macOS, `install.ps1` on Windows. The installer performs the state migration, so your Agents and stored harness logins are carried over. From this release onwards, use `agentctl self update`.
- **A host release does not change your Sandbox image.** The published manifests under `agents/` reference `:latest` images, and updating `agentctl` and `agentd` neither pins an image nor refreshes one that is already in use: an existing Agent keeps the image its Sandbox was created with. To pick up a newer image, delete the Agent and apply it again (`agentctl delete agent/<name>`, then `agentctl apply -f <manifest> --wait`).
- `agentctl` explains what went wrong instead of reporting a bare failure. A manifest that cannot be applied names the setting at fault, for example an environment or secret value missing from the `.env` file; an image build that fails shows the failing step before it is retried; and a wait that runs out of time ends with the Agent's own current reason rather than a generic timeout.
- The hostname inside an Agent's Sandbox is the Agent name, so shell prompts and logs read `agent@<agent-name>` instead of `sandbox-<uuid>`. A Sandbox created before this release keeps its old hostname until it is recreated with `agentctl delete` followed by `agentctl apply`.
- `spec.harnesses[].version` is optional. The Agent image owns the harness version; declare a version only when you want it verified exactly at setup, and omit it so that an image bump needs no manifest change. The published manifests under `agents/` no longer pin a version.
- A Session is treated as idle after 30 minutes without activity rather than 5, and the timer restarts whenever the Session does something, so a long turn is no longer parked while it is still working. Harnesses launched inside a Sandbox no longer show their own auto-update prompts.
- Git inside the published Agent images authenticates through the `gh` CLI, so `git push` works in a fresh Sandbox instead of failing with `could not read Username for 'https://github.com'` until `gh auth setup-git` was run by hand. The manifests also allow the token to be used against `gist.github.com`, which git-level access to Gists needs; pushing to a Gist or cloning a private one requires the token to grant Gist access.

### Fixed

- Sessions start Claude Code on the current Fable model. The mediated login cannot list models, so Fable never appeared in the `/model` picker and could not be selected at all; Sessions now launch on the `fable` alias, which follows the latest Fable release rather than staying on the generation that shipped with the image. Other listed models can still be chosen with `/model`.
- Agents start on macOS hosts with long home directory paths. The Microsandbox control socket could exceed the 104-byte limit macOS places on Unix socket paths, and a short private runtime directory is now used when the usual path does not fit.
- The first start of an Agent whose image clones a repository no longer fails with `systemd did not finish booting within 90s` and succeeds only on the next attempt. The workspace clone now runs alongside the rest of the boot rather than blocking it.
- Configuring Podman in a Sandbox waits for the guest to finish booting, so setup no longer fails once with `System has not been booted with systemd as init system` before succeeding on a retry.
- A forwarded port stays open until both directions of the connection have closed, so a client that half-closes while it waits for the response is no longer cut off early.
- Installing on Windows no longer fails while `install.ps1` verifies the downloaded release archive.

## [0.1.0-preview.1] - 2026-08-26

### Added

- First public preview of the experimental Agent platform: `agentctl` and `agentd`, declarative Agents with durable tmux-backed Sessions in isolated Sandboxes, mediated harness and GitHub authentication, and the published Agent images.
