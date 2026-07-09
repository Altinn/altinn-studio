# AGENTS.md — Localtest (`src/Runtime/localtest`)

A .NET service that **emulates the Altinn 3 platform services** an app needs (authentication,
authorization, storage/register-style data, etc.) so developers can run and test their apps locally
without the real cloud platform. It is normally launched via Docker/Podman and `studioctl`.

Part of the [Runtime services](../AGENTS.md). Full details: [`README.md`](README.md).

## What it provides

- Local stand-ins for the Platform services apps call at runtime, served at `local.altinn.cloud`.
- Configurable **test data**: users, parties, roles, and authorization. For example, to grant a role,
  edit `testdata/authorization/roles/User_{userId}/party_{partyId}/roles.json` and restart Localtest.
- k6 sample load test (`k6/loadtest.sample.js`) that can be adapted to run against a local app.

## Working here

- Prerequisites: a .NET SDK, Docker or Podman, and `studioctl` (see [`src/cli`](../../cli/AGENTS.md)).
- Changes to emulated behavior should stay faithful to the real Platform contracts apps depend on — the
  point is that an app behaves the same locally as in the cloud.
- Common gotcha: if Localtest reports the app isn't running when it is, it's usually a firewall/port
  issue — see the "Known issues" section in `README.md`.
