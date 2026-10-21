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

## Correspondence

Localtest emulates the Correspondence API apps use to send messages, such as the signing call to action each
signee receives and the receipt with the signed documents. `studioctl` points
`PlatformSettings__ApiCorrespondenceEndpoint` at it. The wire models in `Controllers/Correspondence` mirror what
the app libraries send and read; a field the app client marks `required` must be in every response.

- `POST correspondence/api/v1/correspondence` creates one correspondence per recipient and publishes it at once.
  `GET …/correspondence/{id}/details` returns it with its attachments and notifications.
- **Validation mirrors the real API's, with its error codes.** `CorrespondenceRequestValidator` makes the checks
  that need only the request (recipient format, content, field lengths, dates, notification texts, custom
  recipients, the property list, reply links, and attachment names, types and expiry), with the messages and
  `errorCode`s from the Correspondence API's error catalog.
  Recipients are looked up among the test data's parties (`1029`). Where a real check can't be repeated exactly,
  such as markdown in a title, the local one is more lenient: Localtest must never refuse what a deployed
  environment accepts, so add a case to the accepted-requests test whenever you tighten a rule.
- **Not checked locally:** the resource registry, access to the resource, the service owner agreement, the
  contact reservation register (KRR), confidentiality and Dialogporten. Test those in TT02.
- **`idempotentKey` is load-bearing:** a reused key answers 409 Conflict, which apps treat as "already sent"
  when they retry. As in the real API, the key is looked up after the model validation and before the other
  checks, so a retry that has since become invalid, such as one whose due date has passed, still gets 409.
  Duplicate detection runs under a lock, so concurrent sends with one key create one message.
- Attachments go through `POST …/attachment`, `POST …/attachment/{id}/upload` and `GET …/attachment/{id}`, as
  the app client sends them. An upload is published at once (no malware scan), and a correspondence may only
  reference published attachments.
- **Notifications are worked out, not sent.** `CorrespondenceNotificationBuilder` applies the requested channel
  and template to the recipient's contact information in the test data and the custom recipients (only those,
  with `overrideRegisteredContactInformation`), and orders a reminder a week later when asked. The result is
  stored with the correspondence. A generic template's text is a stand-in for the real API's wording.
- Each correspondence is stored as `{correspondenceId}.json` in the `correspondence` folder under the storage
  path, with the request body the app sent, so you can see exactly what went out. Attachments are stored in
  its `attachments` subfolder, as `{attachmentId}.json` with their data in `{attachmentId}.bin`.

## Build & run

`LocalTest.sln` / `src/LocalTest.csproj` is a normal .NET project:

```bash
dotnet build LocalTest.sln    # from src/Runtime/localtest
```

Normally you don't run it by hand — `studioctl env up` starts it (Docker/Podman) alongside the other
local services. The `Makefile` here only holds the `podman-selinux-bind-hack` helper, not build/test targets.

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
