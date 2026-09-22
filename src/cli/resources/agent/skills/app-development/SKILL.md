---
name: altinn-studio-app-development
description: Build, change, run, and test Altinn Studio apps. Use for app configuration, data models, layouts, texts, process flows, authorization, backend logic, and local testing with studioctl and localtest.
---

# Develop Altinn Studio apps

Use `studioctl` as the entry point for local Altinn Studio app development. The installed command's help is authoritative;
inspect `studioctl --help` and the relevant `studioctl <command> --help` before relying on flags or behavior.

## App anatomy

An Altinn Studio app is a .NET ASP.NET Core application.
Since Altinn Studio is a low-code platform, lots of features/capabilities are built around configuration.
Most behavior lives in `App/`; the repository root holds the solution, container build, and deployment configuration:

```text
<app-root>/
|-- App/
|   |-- App.csproj                    Backend project and Altinn.App package versions
|   |-- Program.cs                    Service registration and app startup
|   |-- config/
|   |   |-- applicationmetadata.json App identity, data types, and allowed parties
|   |   |-- process/process.bpmn      Tasks, events, and transitions
|   |   |-- authorization/policy.xml  Authorization rules
|   |   `-- texts/resource.<lang>.json User-facing texts by language
|   |-- models/                       Data-model schemas and generated C# types
|   |-- ui/                           Layout sets, pages, components, and UI settings
|   |-- options/                      Static option lists, when present
|   |-- logic/, services/, Actions/   Custom backend behavior, when present
|   `-- wwwroot/                      App-specific static assets, when present
|-- deployment/                       Helm values and deployment configuration
|-- Dockerfile
`-- App.sln
```

The shape varies by app version and enabled features. Follow the identifiers that connect files:

- Task IDs in `config/process/process.bpmn` select the UI for each process task. Newer apps commonly use matching
  `ui/<task-id>/` directories; older apps map tasks through `ui/layout-sets.json`.
- Data-type IDs in `config/applicationmetadata.json` connect tasks, models, and UI settings. Layout components bind
  fields from the selected model.
- `ui/<layout-set>/Settings.json` defines page order and settings. Files in `layouts/` define pages and components.
- Text keys used by layouts, validation, or code resolve through `config/texts/resource.<lang>.json`. Keep supported
  languages aligned when changing user-facing text.
- `Program.cs` registers custom C# implementations. Apps usually group them under `logic/`, `services/`, or similar.

Read the closest `AGENTS.md`, then inspect the relevant slice of this graph.

## Get an app

You may be directed to an existing checkout, if not, use studioctl to checkout an app.
Relevant commands:

```sh
studioctl auth status --json
studioctl auth login
studioctl apps search --json "<query>"
studioctl app clone <org>/<repo> [destination]
```

Ask the user to log in if `auth status` reports no valid login. Search when no specific repository was given; select
from `apps[]` using `appId` or `cloneUrl`. `--env` accepts `prod`, `dev`, `staging`, or `local` and defaults to `prod`;
Altinn Studio platform developers may use `dev` or `staging`.

## Making changes

- Keep task IDs, data-type IDs, model bindings, page references, and text keys consistent across definitions and uses.
- Use the `$schema` declared by JSON files when present. Preserve the app's existing version and conventions instead
  of copying structures from a different template version.
- Treat generated models and schemas as one unit. Find the repository's generation path before editing output.
- Put backend behavior behind the Altinn.App extension points already used by the app and register implementations in
  `Program.cs`; follow the app's existing organization.

## Upgrading an app from v8 to v9

`studioctl app upgrade v9` migrates the app and reports what it will not change for you. Read its output before
changing anything yourself; it names every file and configuration path it found.

Maskinporten needs deliberate handling, because a v9 app has **two** Maskinporten clients where v8 had one:

- The client **Studio provisions** for the app. It is what a deployed app uses. The app cannot configure it, and
  v9 never reads Maskinporten credentials from the app's own configuration.
- The client **you store locally** with `studioctl app maskinporten set`. A local run uses it when the app calls an
  external API for real.

They are separate registrations in Maskinporten and are granted scopes separately, so an app that works deployed can
still fail locally, and the reverse. The same scopes have to be on both.

When the upgrade reports Maskinporten configuration:

1. **Record the scopes before deleting anything.** The upgrade prints a scope list with the evidence for each entry,
   including the `Scope` value read out of the sections it is telling you to delete. Once the section is gone, that
   record is gone.
2. **For the deployed app**, select those scopes in Studio under App settings, "Velg scopes fra Maskinporten". This
   requires an Ansattporten sign-in on behalf of the organization that owns the app, and takes effect the next time
   the app is built and deployed - so do it *before* deploying, or the deployed app fails on its first token request.
3. **For local runs**, store a client with `studioctl app maskinporten set` and make sure that client already has the
   same scopes in Maskinporten. `studioctl doctor` reports whether one is stored for the detected app.
4. **Do not reintroduce credentials into `appsettings.json`.** v9 does not read them from there in any environment.
   A section that configures the external `Altinn.ApiClients.Maskinporten` package is the exception and is still read
   by that package.

Do not add the `altinn:serviceowner` scopes to either client on the app's behalf: Studio adds them to the provisioned
client automatically when a v9 app is built, and a local run does not need them.

## Run and test

From the app root:

```sh
studioctl env up
studioctl env status --json
studioctl run --detach --json
studioctl app ps --json
```

For investigating failures, use `studioctl app logs` and `studioctl env logs`.
`studioctl doctor` can be used if there are problems with `studioctl` (or there are missing capabilities).

If local hostnames do not resolve, inspect `studioctl env hosts status`. `studioctl env hosts add` changes the system
hosts file, so explain that effect before running it with the host's normal privilege mechanism.

Open the `url` from the `run` result; `logPath` identifies its log file. `app ps` reports status in `running` and
`apps[]`, but does not return the app URL. The `http://local.altinn.cloud:8000` root page contains the login form,
not the app.

### Test changes to Altinn Studio itself

This is mostly for internal Altinn Studio/platform developers, not service owner app developers.
Mostly used within the `Altinn/altinn-studio` monorepo.
Useful when testing changes to e.g. localtest, pdf3, frontend, workflow-engine-app or other
Altinn Studio platform components.

- `STUDIOCTL_INTERNAL_DEV=true studioctl env up` builds supported LocalTest/runtime service images from the current
  monorepo checkout.
- `studioctl env up --dev-workflow-engine` routes the workflow-engine component to a host process, normally at
  `http://localhost:9090`.
- `studioctl run --dev-frontend` serves frontend assets from the current monorepo checkout while the app frontend
  development server is running.

## Stop

```sh
studioctl app stop
studioctl env down
```

Do not reset state, remove credentials, delete files, or broadly terminate processes unless requested and precisely
targeted.
