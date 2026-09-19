---
name: altinn-studio-app-development
description: Develop and test Altinn Studio apps with studioctl and LocalTest. Use when cloning, building, running, debugging, or browser-testing an Altinn Studio app, or when changing the Altinn Studio app runtime, frontend, or local development services.
---

# Develop Altinn Studio apps

Use `studioctl` as the entry point for local Altinn Studio app development. The installed command's help is authoritative;
inspect `studioctl --help` and the relevant `studioctl <command> --help` before relying on flags or behavior.

## Discover the environment

Start by locating the repository and available capabilities rather than assuming a particular agent or host layout:

```sh
git rev-parse --show-toplevel 2>/dev/null || pwd
command -v studioctl
studioctl version
studioctl doctor --json
```

- An external app may be in any user-selected directory. In a published Altinn Studio Agent, keep external app
  checkouts beneath `/home/agent/code/apps/` unless the user specifies another location.
- The Altinn Studio monorepo contains test apps under `src/test/apps/`; keep those in place.
- Full published Agents include a container runtime and Chromium. Minimal Agents do not support local environment or
  browser testing. On other hosts, use `studioctl doctor` and tool discovery to determine what is available.
- Read the closest `AGENTS.md` files before changing a repository. In the monorepo, also read the relevant area
  guidance for `src/App`, `src/Runtime`, `src/Designer`, or `src/test`.

If `studioctl` is missing outside a published Agent, follow the current installation instructions in
`src/cli/README.md` when working in the monorepo, or the official Altinn Studio documentation. Do not silently install
software on a user's host.

## Get an app

Check authentication without exposing stored credentials:

```sh
studioctl auth status --json
```

Use `studioctl auth login --help` if login is required. Interactive login is preferred for people. Automation may
read an existing Studio API key from standard input, but never print, copy, commit, or persist a key outside the
credential store.

When asked to clone an app, inspect `studioctl app clone --help`, create the selected parent directory, and clone by
`org/repo` or Studio repository URL. Do not invent an organization, repository, environment, or destination. Reuse
an existing checkout when the user has already supplied one.

## Start and run

From the app checkout:

1. Inspect `studioctl env hosts status`. If required hostnames are missing, explain that `studioctl env hosts add`
   changes the system hosts file and run it with the host's normal privilege mechanism when authorized. Published
   full Agents prepare these entries at boot.
2. Run `studioctl env up`. Use `studioctl env status` to confirm the services and record their image/build information
   when investigating a defect.
3. Inspect `studioctl run --help`, then run the app. Prefer `studioctl run --detach` when the same session must perform
   browser checks or other work; use foreground mode when live output is the task.
4. Use `studioctl app ps`, `studioctl app logs`, and `studioctl env logs` to identify startup or runtime failures.

Use the exact app URL printed by `studioctl run`; the bare `http://local.altinn.cloud:8000` address is the LocalTest
landing page, while an app URL includes its organization and repository path. For automation, run
`studioctl run --detach --json` and read the `url` field instead of constructing or parsing a URL. Do not report the
app healthy based only on a started process: load it in a browser when browser testing is available, inspect the page
and console, and exercise the changed behavior. Use the `playwright-cli` skill when installed. Use repository-provided
test users and fixtures, and never capture personal data or secrets.

## Iterate and verify

- Changes to app configuration and layout JSON normally reload through the running development setup. Verify the
  behavior rather than assuming a reload occurred.
- Restart the app after backend C# changes unless the running command explicitly confirms that it is watching them.
- Create a fresh test instance when existing instance data or process state could hide the effect of a change.
- Run the closest app or monorepo formatting, build, and test targets in addition to browser verification.
- For a user-visible pull request, capture focused evidence with the `pr-evidence` skill when it is available.

For machine-readable automation, prefer a command's documented `--json` output over parsing human-readable text.
Treat a nonzero exit status as a failure even when useful diagnostics were printed.

## Work on platform code

When the app is testing changes from the Altinn Studio monorepo, distinguish the two independent development modes:

- Run `STUDIOCTL_INTERNAL_DEV=true studioctl env up` from inside the monorepo to build supported LocalTest/runtime
  service images from the current checkout. Read `src/cli/README.md` and `studioctl env up --help` first.
- Run `studioctl run --dev-frontend` while the app frontend development server is running to serve frontend assets
  from the current checkout. Read `src/App/frontend/AGENTS.md` and the command help first.

Do not enable either mode for ordinary app-only work. They make startup slower and test different source than the
released environment.

## Diagnose and clean up

On failure, capture `studioctl doctor --json`, environment status, app status, and the narrowest relevant logs before
changing configuration. Preserve the first useful error and distinguish app compilation failures from container,
LocalTest, networking, and browser failures.

Stop only resources started for the task:

```sh
studioctl app stop
studioctl env down
```

Inspect each command's help for selecting a specific app or stopping all apps. Do not run destructive reset,
credential removal, broad process termination, or deletion commands unless the user explicitly requests them and
the exact target has been verified.
