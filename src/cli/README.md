# studioctl

`studioctl` is the CLI for local development of Altinn Studio apps. It clones an app from Studio, starts the local
environment the app runs against, and runs the app. It installs with `studioctl-server`, a .NET process that commands
start when they need it, and the resources for [localtest](../Runtime/localtest/README.md).

App developers install and use it as
[docs.altinn.studio](https://docs.altinn.studio/en/altinn-studio/v8/guides/development/local-dev/) describes.
`studioctl --help` lists the commands. The App backend and App frontend test workflows run their test apps through the
[setup-studioctl action](../../.github/actions/setup-studioctl/action.yaml).

## Which images the environment runs

`studioctl env up` runs the newest localtest build from `main`, and the pdf3 and workflow engine builds that tt02 runs.
It checks for newer builds each time it starts the environment, and starts with the images already on the machine
when it cannot reach the registry. [images.go](internal/config/images.go) pins the other images and names the
variable that overrides each one, such as `STUDIOCTL_IMAGE_WORKFLOW_ENGINE`.

`studioctl env status` shows the build each container runs. Quote it in a bug report, since the tags that follow tt02
move with each deployment.

studioctl supplies the configuration of the containers it starts, so a change to that configuration must keep working
with the previous studioctl release. [Runtime's README](../Runtime/README.md#images-the-local-environment-runs) has
the rule.

## How the workflow engine runs steps

In v9, an app's process hooks and service tasks run as steps of the workflow engine. `studioctl env up` gives the
engine the settings it has in Altinn's environments, except two that
[workflow_engine.go](internal/cmd/env/localtest/components/workflow_engine.go) changes for development:

- A step that keeps failing fails its workflow about a minute after the first failure. In Altinn's environments the
  engine retries it for a day.
- A step can run for 30 minutes before the engine cancels it, so a developer can stop in a debugger. The engine's
  default is 100 seconds.

Options the app sets on a step still win, such as the 10-minute timeout of a service task. Only failures count
against the retries, so a step that waits for something, such as an eFormidling delivery, still waits as long as its
own budget allows. After fixing the app, the developer runs a failed workflow again with Retry in the engine dashboard
or with the instance's `process/resume` endpoint, and the step gets its retries again.

`env up --dev-workflow-engine` does not apply these settings, since studioctl does not start the engine on the host.
Its launch profile keeps the retries and the timeout of Altinn's environments.

## Development

`make user-install` installs studioctl, `studioctl-server` and the localtest resources from source, the same way the
install scripts do. `make dev-install` installs them into `build/dev-home` instead, and `make dev-run CMD="env up"`
runs that installation.

- `make dev-install` publishes `studioctl-server` in Release configuration, which can raise warnings that `make test`
  does not. Before you push .NET changes, run `make test` and `make dev-install`.
- On macOS, `make dev-run` in a deeply nested checkout, such as a worktree, fails with `connect: invalid argument`,
  because the socket path for `studioctl-server` is too long. Set `STUDIOCTL_SOCKET_DIR` to a short directory.
- The top level of `internal/cmd` parses commands, orchestrates and renders output. The work lives in its subpackages
  and the rest of `internal`.
- Output states facts in a line: what is configured or wrong, and the command that changes it. It gives no advice
  prose, and no paths to files that studioctl manages.
- The [app-development skill](../../agents/_skills/app-development/SKILL.md) ships with studioctl, for the app
  developers who use it. Update it in the pull request that changes studioctl's flags, output or behavior.
- The .NET libraries in [common](common/README.md) belong to `studioctl.slnx`, so `make test` tests them.
- [Releasing](../../docs/releasing.md) says how to create the release pull request. Merging it runs
  [release-studioctl.yaml](../../.github/workflows/release-studioctl.yaml).

## Run against local builds

`STUDIOCTL_INTERNAL_DEV=true studioctl env up`, run inside the altinn-studio checkout, builds the localtest, pdf3 and
workflow engine images from the checkout instead of pulling releases. CI sets the same variable, so a local run tests
the app against the services the way CI does. `env up --dev-workflow-engine` routes the workflow engine to a process
on the host.

`studioctl run --dev-frontend` points the app at the App frontend's `yarn start` dev server on port 8080. Run
`studioctl env hosts add` first, since the app loads the frontend from `app-frontend.local.altinn.cloud`.
`app env --dev-frontend` prints the same environment for an IDE.
