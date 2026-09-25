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

- `agentctl describe agent` shows the provisioning in progress, or the one that failed with its failing step's output,
  whether a failure is being retried, and how long each condition has held its state.
- Agent status in `agentctl get -o yaml` and `-o json` includes condition transition times, the failure class and
  provisioning progress.
- Provisioning shows Agent setup and SSH access as phases of their own.
- The `agentctl` terminal UI is a live triage view: every Agent and Session with its state and how long it has been in
  it. Sessions that need input are marked and counted, `tab` jumps to the next one, `/` filters, and `?` lists every
  key.
- In the terminal UI, a side panel shows the selected Session's recent turns or the selected Agent's status. `p` follows
  an Agent's provisioning, which also opens for an Agent created with `c`, or prompts a Session without attaching.
- Altinn Agents include `typos` and `hunspell`, so the repository spell check (`yarn spell:quick`, `yarn spell:check`
  and the pre-commit hook) runs inside an Agent.

### Changed

- Commands that wait for an Agent, such as `apply --wait`, pick up provisioning already in progress and no longer drop
  output when they fall behind.
- Image pulls and imports show downloading, materializing and assembling as separate steps.
- The terminal UI updates as Agents and Sessions change instead of every two seconds, and keeps the last state on screen
  while `agentd` is unreachable.
- Terminal UI forms share one layout with aligned fields, and `NO_COLOR` turns off color while every state keeps its
  glyph.
- New full Altinn Agents finish setup faster. Chromium's trust in the certificate bundle is imported faster and in the
  background, so Sessions no longer wait for it.

### Fixed

- The terminal UI keeps the selection on the same Agent or Session when rows move or an Agent is folded.
- The terminal UI's new-Session form rejects a name the Agent already uses instead of attaching to that Session.

## [0.1.0-preview.6] - 2026-09-23

### Changed

- Altinn, self-development, minimal and worktree Agents install Claude Code 2.1.280.
- Altinn, self-development and worktree Agents install Codex CLI 0.156.0, with workspace routing and activity hooks updated for its startup flow.

## [0.1.0-preview.5] - 2026-09-22

### Added

- Codex and Claude Code Sessions show their model, working directory, Git branch, context usage, usage limits, harness
  version and Fast mode in a persistent status line.
- Altinn Agents can authenticate ordinary HTTPS Git commands to Azure DevOps with an optional host-mediated personal
  access token, including cloning the `altinn-studio-infra` repository without exposing the token in the Sandbox.
- Altinn and self-development Agents include Neovim with line numbers, cursor highlighting, a filetype statusline, the
  `habamax` theme and built-in syntax highlighting for C#, JavaScript, TypeScript, JSON and XML.
- Agent images include the `gh stack` extension for creating and managing stacked pull requests.
- The `agentctl` terminal UI supports mouse selection, scrolling, clickable controls and deliberate double-click
  actions while retaining all keyboard controls.
- Agent Skill entries may declare an installed `name` separately from their source directory.
- A harness installation may be declared `optional`, so an Agent is created without it when its host login is
  absent. Altinn Agents declare Codex this way, and signing in on the host installs it on the next convergence.
- Altinn Agents install the repository's text-review and Norwegian copy-editing Skills, so a Session has them as
  well as a local checkout.
- Agent manifests may mark a mediated secret as optional, so an absent or empty value omits that binding instead of
  blocking Agent provisioning.
- Altinn Agent images include `studioctl`, the Altinn Studio app-development skill and `/home/agent/code/apps` for
  app checkouts. They log `studioctl` in to each configured production, staging or development Studio environment
  with a host-mediated API key. Full images also prepare LocalTest hostnames for browser testing.

### Changed

- Pull request evidence guidance is shorter, with readable pacing and no fixed clip
  duration. The GIF conversion helper now accepts files up to 10 MiB instead of 8 MiB.
- Altinn, self-development, minimal and worktree Agents install the latest stable Claude Code and Codex CLI
  harnesses, and Codex command failures remain visible in `agentctl turns` with the new transcript format.

### Fixed

- Agent Sessions set `XDG_RUNTIME_DIR`, so `skopeo`, `buildah` and other tools that expect a user runtime
  directory run instead of failing with a permission error on a path they cannot read.
- `podman run --init` works in full Agents; the `catatonit` binary the flag needs was missing from the image.
- Chromium in a full Altinn Agent trusts the same host-mediated certificate authorities as command-line tools, so
  browser tests can load HTTPS dependencies without disabling certificate verification.

## [0.1.0-preview.4] - 2026-09-18

### Added

- The release installers accept `AGENT_INSTALL_MODE=standalone` to verify and copy only `agentctl` and `agentd` into
  `AGENT_INSTALL_DIR`. This supports immutable images and CI jobs without creating self-update state, migrating Agent
  data, starting the daemon, or changing `PATH`.
- Agent manifests support chained `AgentVariant` files named `agent.<variant>.yaml`. Select them with `--variant` or the TUI, which also supports ignored local variants and an environment file.
- SSH access to Agents. Declare `spec.access: [{type: ssh}]`, then `agentctl ssh <agent> [-- command]` opens a shell or runs a command in the Sandbox as `agent`. `agentctl ssh-config install` lets plain `ssh`, `sftp` and editors reach the Agent as `agentctl-<name>`, and `agentctl ssh-info <agent> -o json` prints the connection details. The Altinn Agent images and the examples declare it; an Agent created from an older image must be deleted and re-applied.
- Windows contributors can run `.\make-user-install.ps1` to build, package and install a local Agent without Make.

### Changed

- `agentctl apply` defaults to `./agent.yaml`. The self-development and Altinn Agents provide nested and worktree variants; Altinn also provides nested-build variants.

### Fixed

- SSH shells, remote commands and editor terminals now inherit the same Agent tool, configured environment and
  mediated certificate settings as Sessions and `agentctl exec`.
- Concurrent network requests from an Agent no longer intermittently fail with DNS, HTTP or TLS errors, especially on Windows hosts.
- Deleting an Agent no longer logs a panic when its Sandbox has an active network-control connection.
- The self-development Agent examples build with their SSH configuration, so the checkout, worktree and nested variants can be applied.
- On Windows, detaching from a Session with `Ctrl-b d` returns control to the terminal UI without dropping the next key press.
- Attached Sessions support mouse-wheel scrolling through up to 50,000 lines of terminal history for new panes. Codex and Claude Code keep their conversations in that history; Claude Code no longer uses its fullscreen renderer, which could corrupt the display when scrolling in tmux. Reattaching enables mouse support for existing Sessions, but cannot recover discarded output.
- Agent setup now writes Sandbox files only when their contents changed, and replaces them atomically. Codex no longer reports missing skill frontmatter after each reconciliation pass.

### Security

- Applying an Agent rejects bind mounts containing `.env` files, case-insensitively and regardless of ignore rules.

## [0.1.0-preview.3] - 2026-09-17

### Added

- `agentctl create` and `agentctl attach` accept `--model` and `--effort`, and the terminal UI's new-session form has the same fields, to choose the model and effort level a Session's harness launches with. Values are the harness's own, for example `fable` and `high` for Claude Code. `spec.harnesses[].defaults` declares per-installation defaults. The choice is fixed for the Session, applied on every relaunch and resume, and shown by `agentctl get sessions`.

### Changed

- Claude Code Sessions launch on the `fable` alias only when the manifest declares it; the `agents/` manifests and the examples do, and your own manifests need `defaults: { model: fable }` on the Claude Code installation to keep it for new Sessions. Sessions created earlier keep launching on `fable`.
- The Sandbox runtime (microsandbox) was updated. Linux hosts with older system libraries, such as Ubuntu 22.04, can now install it, and a Sandbox that fails to start reports the runtime's own error instead of a bare timeout.
- Agent instructions now tell Claude Code and Codex not to add `Co-Authored-By` or similar AI-attribution trailers to commits and pull requests.
- The Altinn Agent images run on Norwegian local time (Europe/Oslo) instead of UTC, so `date`, file timestamps and log output inside an Agent match the clock where the work is reviewed. An existing Agent keeps the image it was created with; delete and re-apply it to pick this up.

### Fixed

- On Windows, starting a Sandbox with a large root filesystem could take an hour while its disk was copied. The copy now takes seconds.
- Linkerd could not start inside a kind cluster running in a Sandbox because the Sandbox kernel lacked the iptables owner match its proxy-init needs. The match is now built in.
- Building the Agent images, or the minimal and worktree examples, failed with a certificate error where the network inspects TLS, such as inside another Agent. The npm, Yarn, Corepack and Playwright downloads now trust the Agent's certificate bundle while the image is built.
- Test suites and dev servers inside an Agent could fail to start with `user limit (128) on inotify instances reached` before running anything, because the guest kept the kernel's desktop-sized file-watcher limits. The Agent images now raise them to the values the self-hosted CI runners already use.
- Logging a nested Agent into Claude failed with an empty credential. Claude Code hides `CLAUDE_CODE_OAUTH_TOKEN` from the commands it runs, so the documented `agentctl claude login --from-stdin` step had nothing to read. An Agent now also carries its Claude credential as `AGENT_CLAUDE_ACCESS_TOKEN`, matching `AGENT_CODEX_ACCESS_TOKEN`, and the self-development instructions use it.

## [0.1.0-preview.2] - 2026-09-15

### Added

- `agentctl self update` installs a newer release, and `--check` only reports whether one exists. It migrates your Agent state behind a backup, relaunches resumable Sessions, and refuses to run while work is in flight. ([#20397](https://github.com/Altinn/altinn-studio/pull/20397))
- `agentctl apply --wait` stays attached and streams provisioning progress — image pull, build, Sandbox creation, harness setup — until the Agent is Ready. `wait`, `attach` and `exec` show the same progress. ([#20341](https://github.com/Altinn/altinn-studio/pull/20341))
- `agentctl port-forward <agent> [ADDRESS:]LOCAL:GUEST...` forwards local TCP ports into a running Sandbox, and `:GUEST` picks a free local port. In the terminal UI, `f` adds a forward and `F` lists them. ([#20189](https://github.com/Altinn/altinn-studio/pull/20189), [#20245](https://github.com/Altinn/altinn-studio/pull/20245))
- `agentctl create`, `prompt` (with `--wait`) and `turns` drive a Session from the command line without attaching. Prompt text comes from `--prompt`, `--file` or piped standard input. ([#20374](https://github.com/Altinn/altinn-studio/pull/20374))
- Press `c` in the terminal UI to create an Agent, choosing from the manifests found by walking down from the repository root. ([#20242](https://github.com/Altinn/altinn-studio/pull/20242), [#20358](https://github.com/Altinn/altinn-studio/pull/20358))
- `spec.environment` copies declared non-secret values from the manifest's `.env` into the Sandbox. `GIT_USER_NAME` and `GIT_USER_EMAIL` also set the Sandbox user's global Git identity. ([#20416](https://github.com/Altinn/altinn-studio/pull/20416))
- `spec.skills` installs skill directories into the Sandbox and `spec.instructions` accepts several sources. Every image gains asciinema and agg, the full image ffmpeg and a Playwright CLI, and the manifests a `pr-evidence` skill. ([#20348](https://github.com/Altinn/altinn-studio/pull/20348))
- `agentctl apply --env-file` names the file supplying the manifest's declared environment and secret values, instead of the `.env` beside the manifest. Keep files holding secrets outside bind-mounted directories. ([#20339](https://github.com/Altinn/altinn-studio/pull/20339))
- `agentctl get` and `agentctl describe` accept `-o json`, so tooling can read Agent and Session state instead of parsing the table. ([#20374](https://github.com/Altinn/altinn-studio/pull/20374))
- `agentctl claude login --from-stdin` and `agentctl codex login --from-stdin` take a credential from standard input, so an Agent can log in a nested Agent without ever holding a real one. ([#20339](https://github.com/Altinn/altinn-studio/pull/20339))

### Changed

- **Upgrading from preview 1.** Stop the running `agentd` first — preview 1 cannot stop itself — then re-run `install.sh` or `install.ps1` once, which migrates your Agents and stored logins. Use `agentctl self update` from then on. ([#20397](https://github.com/Altinn/altinn-studio/pull/20397))
- **A host release does not change your Sandbox image.** The `agents/` manifests reference `:latest`, and an existing Agent keeps the image it was created with. Delete and re-apply the Agent to pick up a newer one.
- `agentctl` explains failures instead of reporting them bare: the manifest setting at fault, the failing image build step, or the Agent's own reason when a wait times out. ([#20341](https://github.com/Altinn/altinn-studio/pull/20341))
- The hostname inside a Sandbox is the Agent name, so prompts and logs read `agent@<name>`. Existing Sandboxes keep their old hostname until they are recreated. ([#20363](https://github.com/Altinn/altinn-studio/pull/20363))
- `spec.harnesses[].version` is optional: the image owns the harness version, so an image bump needs no manifest change. The `agents/` manifests no longer pin one. ([#20250](https://github.com/Altinn/altinn-studio/pull/20250))
- A Session goes idle after 30 minutes rather than 5, and the timer restarts on activity. Codex no longer checks for its own updates at startup. ([#20374](https://github.com/Altinn/altinn-studio/pull/20374))
- Git in the published images authenticates through the `gh` CLI, so `git push` works in a fresh Sandbox without `gh auth setup-git`. The token is also allowed against `gist.github.com`. ([#20151](https://github.com/Altinn/altinn-studio/pull/20151))

### Fixed

- Sessions launch Claude Code on the `fable` alias. Fable never appeared in the `/model` picker, so it could not be selected at all, and a pinned generation would not follow new releases. ([#20147](https://github.com/Altinn/altinn-studio/pull/20147), [#20314](https://github.com/Altinn/altinn-studio/pull/20314))
- Agents start on macOS hosts with long home directory paths, where the Microsandbox control socket could exceed the 104-byte limit on Unix socket paths. ([#20411](https://github.com/Altinn/altinn-studio/pull/20411))
- Configuring Podman waits for the guest to finish booting, instead of failing once with `System has not been booted with systemd as init system`. ([#20346](https://github.com/Altinn/altinn-studio/pull/20346))
- Installing on Windows no longer fails while `install.ps1` verifies the downloaded release archive. ([#20143](https://github.com/Altinn/altinn-studio/pull/20143))

## [0.1.0-preview.1] - 2026-08-26

### Added

- First public preview: `agentctl` and `agentd`, declarative Agents with durable tmux-backed Sessions in isolated Sandboxes, mediated harness and GitHub authentication, and the published Agent images.
