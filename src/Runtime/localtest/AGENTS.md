# AGENTS.md — Localtest (`src/Runtime/localtest`)

A .NET service that **emulates the Altinn 3 platform services** an app needs (authentication,
authorization, storage/register-style data, etc.) so developers can run and test their apps locally
without the real cloud platform. It is normally launched via Docker/Podman and `studioctl`.

Part of the [Runtime services](../AGENTS.md). Full details: [`README.md`](README.md).

## What it provides

- Local stand-ins for the Platform services apps call at runtime, served at `local.altinn.cloud`.
- Configurable **test data**: users, parties, roles, and authorization. An app defines its own test
  users in `App/wwwroot/testData.json`, which Localtest fetches from the running app — that is where
  app-specific users and roles belong, and it is what to recommend to app developers. The `testdata/`
  folder here holds the built-in users, is baked into the image at `/testdata`, and changing it means
  rebuilding (`STUDIOCTL_INTERNAL_DEV=true studioctl env up`). See `README.md` for how the two combine.
- k6 sample load test (`k6/loadtest.sample.js`) that can be adapted to run against a local app.

## Build & run

`LocalTest.sln` / `src/LocalTest.csproj` is a normal .NET project:

```bash
dotnet build LocalTest.sln    # from src/Runtime/localtest
```

Normally you don't run it by hand — `studioctl env up` starts it (Docker/Podman) alongside the other
local services. The `Makefile` here only holds helpers (`podman-selinux-bind-hack`, `sync-dashboards`),
not build/test targets.

## Working here

- Prerequisites: a .NET SDK, Docker or Podman, and `studioctl` (see [`src/cli`](../../cli/AGENTS.md)).
- Changes to emulated behavior should stay faithful to the real Platform contracts apps depend on — the
  point is that an app behaves the same locally as in the cloud.
- Common gotcha: if Localtest reports the app isn't running when it is, it's usually a firewall/port
  issue — see the "Known issues" section in `README.md`.
- **`studioctl env up` follows the latest build of this image**, with no ring or approval between
  main and every developer's machine (an unreachable registry is the one exception: it keeps the
  copy already on the machine). studioctl supplies the container's configuration — ports, mounts,
  environment — and the studioctl a developer has installed is older than the image it pulls, so a
  renamed setting or a moved port breaks `env up` for everyone within the hour. Keep the previous
  spelling working for at least one studioctl release, and change studioctl in the same pull request.
