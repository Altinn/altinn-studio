# Altinn.App .NET libraries

<!-- This README is also the readme of the NuGet packages, so its links are absolute. -->

The Altinn.App libraries are what the backend of an Altinn 3 app is built on. An app references `Altinn.App.Api` and
`Altinn.App.Core`. The libraries serve the API that the app frontend and service owners' systems call, run the app's
process, and call the Altinn platform services on the app's behalf. Apps add their own logic by implementing the
interfaces in `Altinn.App.Core`.

[docs.altinn.studio](https://docs.altinn.studio) documents how to develop apps. The
[changelog](https://github.com/Altinn/altinn-studio/blob/main/src/App/backend/CHANGELOG.md) lists the changes in each
release.

## How it fits

These are the libraries for v9 apps. v8 apps use [app-lib-dotnet](https://github.com/Altinn/app-lib-dotnet).
[Altinn Apps](https://github.com/Altinn/altinn-studio/blob/main/src/App/README.md#how-the-parts-fit) describes how the
libraries fit with the app frontend, the workflow engine and the other app packages.

## Development

`make build` and `make test` cover the main projects. `make build-all` and `make test-all` cover
`solutions/All.slnx`, which CI builds, and add the analyzer and integration tests. `make ti filter=<filter>` runs the
integration tests, which need studioctl and a container runtime, as
[their README](https://github.com/Altinn/altinn-studio/blob/main/src/App/backend/test/Altinn.App.Integration.Tests/README.md)
describes. Packing `Altinn.App.Api` needs a `yarn build` in `src/App/frontend` first.

Outside CI, a test run accepts a changed Verify snapshot and passes, so review the `*.verified.*` files a run rewrote.
Set `TF_BUILD=true` to make a mismatch fail as in CI. The snapshots cover each package's public API, the OpenAPI
document and the telemetry output. A failed integration test run writes its failure output into the snapshots, so
restore them before the next run.

To try a change in an app, replace the app's package references to `Altinn.App.Api` and `Altinn.App.Core` with
project references to this folder's `src`, and run the app against localtest.

The [docs](https://github.com/Altinn/altinn-studio/blob/main/src/App/backend/docs/README.md) hold the coding
standards and how the libraries use the workflow engine.
