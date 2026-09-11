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

## Correspondence

Localtest emulates the Correspondence API an app calls to send messages — for signing apps, the "call to
action" message each signee receives. Apps reach it through `PlatformSettings__ApiCorrespondenceEndpoint`,
which `studioctl` points at `http://local.altinn.cloud:8000/correspondence/api/v1/`. Like the other
emulated services here, it performs no authentication or authorization.

| Route | Behavior |
| ----- | -------- |
| `POST correspondence/api/v1/correspondence` | Creates one correspondence per recipient, each with a fresh GUID, and echoes the recipient string back exactly as sent. |
| `GET correspondence/api/v1/correspondence/{correspondenceId}/details` | Returns the stored correspondence, or 404 problem details when the ID is unknown. |
| `POST correspondence/api/v1/attachment`, `POST …/attachment/{id}/upload`, `GET …/attachment/{id}` | 501 Not Implemented problem details. |

- **Status on init is `Initialized`** — the member the app libraries document as the state of a
  correspondence order right after a successful send. The real service moves it on towards `Published`
  asynchronously; Localtest has no publisher, so it stays at `Initialized`.
- **`idempotentKey` semantics are load-bearing.** A reused key answers **409 Conflict** with the title
  "A correspondence with the same idempotent key already exists", which the app treats as "already sent"
  when it retries a signing step. A key sent with more than one recipient, or an empty GUID key, is 400.
  Duplicate detection scans the stored correspondences under a lock, so concurrent sends of the same key
  still produce exactly one correspondence.
- **Attachments are not supported.** Signing sends none; test attachments in a deployed environment.
- **Data folder:** `LocalPlatformSettings.CorrespondenceDataFolder` (default `correspondence`) under
  `LocalTestingStorageBasePath`, one `{correspondenceId}.json` file per correspondence. Each file holds
  the extracted fields (recipient, idempotent key, resource ID, senders reference, status, created) plus
  the request body the app sent, verbatim, so you can see exactly what was posted.

## Build & run

`LocalTest.sln` / `src/LocalTest.csproj` is a normal .NET project:

```bash
dotnet build LocalTest.sln    # from src/Runtime/localtest
dotnet test test/LocalTest.Tests/LocalTest.Tests.csproj
```

The tests exercise emulated platform contracts, including idempotent instance delegation and
revocation, and Correspondence initialization with its idempotent-key conflict handling.
CI runs them in `.github/workflows/runtime-localtest-build.yml`.

Normally you don't run it by hand — `studioctl env up` starts it (Docker/Podman) alongside the other
local services. The `Makefile` here only holds helpers (`podman-selinux-bind-hack`, `sync-dashboards`),
not build/test targets.

## Working here

- Prerequisites: a .NET SDK, Docker or Podman, and `studioctl` (see [`src/cli`](../../cli/AGENTS.md)).
- Changes to emulated behavior should stay faithful to the real Platform contracts apps depend on — the
  point is that an app behaves the same locally as in the cloud.
- Common gotcha: if Localtest reports the app isn't running when it is, it's usually a firewall/port
  issue — see the "Known issues" section in `README.md`.
