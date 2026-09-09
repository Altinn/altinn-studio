# AGENTS.md — app-template-dotnet (`src/App/template`)

The **.NET app scaffolding templates** (`app-template-dotnet`) that Altinn Studio (the Designer) uses to
generate new Altinn 3 apps and to build their Docker images. They are the starting skeleton every new app
is created from.

Part of the [App runtime](../AGENTS.md).

## ⚠️ Production-critical branch

The Designer uses these templates when building an app's Docker image, and the Designer is
**continuously deployed**. Therefore **the `main` branch must always be production-ready** — a broken
template on `main` breaks app builds for everyone. Be conservative with changes here and verify a
template-generated app still builds.

## Selectable templates

One complete, independently buildable template per selectable version, in `<id>/src`. The scaffolds are
full copies on purpose — they will keep diverging, and each must build and be validated on its own. Do
not factor shared *scaffold* parts out into a base/overlay.

Build tooling (`Directory.Build.props`, CSharpier config, `.config`, `.vscode`) is shared at this level
instead. MSBuild and CSharpier search upwards, and none of it is inside `src/`, so it never reaches a
generated app. Move a file into `<id>/` only when the versions genuinely need different tooling.

| Folder | Altinn.App | TFM       |
| ------ | ---------- | --------- |
| `v8`   | 8.x        | `net8.0`  |
| `v9`   | 9.x        | `net10.0` |

The folder name is the template id. Each folder carries an `src/apptemplate.json` naming it for the
dashboard picker:

```json
{ "displayName": "Altinn App v8", "description": "…" }
```

**v9 was not hand-written.** It started as a copy of `v8`, migrated once with
`studioctl app upgrade v9 -p src/App/template/v9/src`. From there it is maintained on its own — changes
to `v8` are not carried over.

**Adding a version is a folder drop.** Copy a folder, edit its manifest and `App.csproj`, add the id to
the CI matrices, the Renovate rules, and the release-rsync stages in `src/Designer/Dockerfile` — without
the last one the template is missing from the image. No backend change — the Designer discovers them.

Users pick the template when creating an application (`appTemplate` on the create-app request, listed by
`GET designer/api/apptemplates`, behind the `appTemplates` feature flag). Without a choice the Designer
uses `GeneralSettings.DefaultAppTemplate`. `GeneralSettings.TemplateLocation` points at the folder
*holding* the templates and per-template paths are derived from it.

`src/Designer/Dockerfile` runs one release-rsync stage per folder into `Templates/AspNet/<id>/src`. The
`<id>/src` shape makes the image mirror this folder exactly, so a locally run Designer can point straight
at `src/App/template`.

> **v8 needs a sunset date.** A frozen duplicate still has to be security-patched and doubles the CI
> matrix. Once new applications default to `v9`, delete `v8`.

## What a template contains

The skeleton of a runnable Altinn 3 app: the `App` project referencing the
[Altinn.App backend libraries](../backend/AGENTS.md), default configuration, process/BPMN,
data model wiring, and the Dockerfile used to build the app image. Optional feature libraries such as
[codelists](../codelists/AGENTS.md) and [fileanalyzers](../fileanalyzers/AGENTS.md) plug in on top.

## Build & validate

A template *is* a runnable app skeleton (`<id>/src/App.sln`), so building it is the validation:

```bash
dotnet build src/App.sln     # from src/App/template/v8 or /v9 — must succeed on main
```

The Dockerfile at `<id>/src/Dockerfile` is what the Designer uses to build an app image; changes to it
must be checked by building the image, not just the solution. CI covers every template:
`app-template-test.yml` (build + test) and `app-template-build-on-pr.yaml` (release rsync + image build)
both run a `template: [v8, v9]` matrix.

## Working here

- Keep the templates minimal and generic — they are a starting point, not a showcase.
- A change that should apply to every version must be made in each folder. There is no shared layer.
- Changes that bump the referenced Altinn.App library version or alter the build must be validated
  end-to-end (build the solution *and* the image) before landing on `main`.
