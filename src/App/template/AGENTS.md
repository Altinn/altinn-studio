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

There is one complete, independently buildable template per selectable version. They are full copies on
purpose — they will keep diverging, and each must build and be validated on its own. Do not factor shared
parts out into a base/overlay.

| Folder | Altinn.App | TFM       | Notes                                                     |
| ------ | ---------- | --------- | --------------------------------------------------------- |
| `v8`   | 8.x        | `net8.0`  | **Configured default** for new applications.              |
| `v9`   | 9.x        | `net10.0` | Version bump only — app content is not yet v9-migrated.   |

Each carries an `src/apptemplate.json` manifest that names it for the dashboard picker:

```json
{ "id": "v8", "displayName": "Altinn App v8", "description": "…", "deprecated": false }
```

**Adding a version is a folder drop.** Copy a folder, edit its manifest and `App.csproj`, add the id to
the CI matrices and Renovate rules — no backend change. The folder name is the id; a differing `id` in
the manifest is logged and ignored.

Users pick the template when creating an application (`appTemplate` on the create-app request, listed by
`GET designer/api/apptemplates`). Without a choice the Designer uses
`GeneralSettings.DefaultAppTemplate`. `GeneralSettings.TemplateLocation` points at the folder *holding*
the templates and per-template paths are derived, so there are no `AppLocation` / `DeploymentLocation`
settings any more. Configured in `src/Designer/compose.yaml`, `charts/altinn-designer/values.yaml` and
`appsettings.Development.json`.

The Designer image ships every template: `src/Designer/Dockerfile` runs one release-rsync stage per
folder into `Templates/AspNet/<id>/src`. The `<id>/src` shape is deliberate — the image mirrors this
folder exactly, so a locally run Designer can point straight at `src/App/template`.

> **v9 is a scaffold bump only.** Only the Altinn.App version, TFM, `Program.cs` OpenAPI namespace and
> base images were changed so it compiles. Migrating the app content to v9 conventions (layouts under
> `App/ui/<taskId>/`, dropping `layout-sets.json` and `views/Home/Index.cshtml`) is still to do.

> **v8 needs a sunset date.** A frozen duplicate still has to be security-patched (base images, CVE
> bumps) and doubles the CI matrix. Once new applications default to `v9`, delete `v8`.

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
