# AGENTS.md — Altinn Apps (`src/App`)

The building blocks of an **Altinn 3 app**: the runtime an individual deployed public service is built
on. A running app is a .NET backend (built on the libraries here) serving a React frontend (the renderer
here), scaffolded from the template here and generated/deployed by the Designer.

See the root [`/AGENTS.md`](../../AGENTS.md) for how this fits into Altinn 3 as a whole.

## Sub-projects

| Folder | What it is | Stack | Docs |
| --- | --- | --- | --- |
| `backend` | **Altinn.App .NET libraries** — the core backend SDK every deployed app builds on. Layered, feature-organized; exposes APIs for service owners and abstractions for Studio/Platform. | .NET (C#), `AppLibDotnet.slnx` | [backend/AGENTS.md](backend/AGENTS.md) |
| `frontend` | **Altinn 3 app frontend** — React/TS SPA that renders dynamic forms/layouts and talks to the app backend. Ships with every app. | React/TypeScript (Webpack, Jest, Cypress) | [frontend/AGENTS.md](frontend/AGENTS.md) |
| `codelists` | **Altinn.Codelists** — reusable code lists (e.g. SSB classifications) wired to form components via option IDs. Published as NuGet. | .NET (C#) | [codelists/AGENTS.md](codelists/AGENTS.md) |
| `fileanalyzers` | **Altinn.FileAnalyzers** — binary analysis/validation of uploaded files (real MIME detection). Analyzer + validator halves. Published as NuGet. | .NET (C#) | [fileanalyzers/AGENTS.md](fileanalyzers/AGENTS.md) |
| `template` | **app-template-dotnet** — the scaffolding the Designer uses to generate new apps and build their images. `main` must stay production-ready. | .NET (C#) | [template/AGENTS.md](template/AGENTS.md) |
| `azure-pipelines` | Azure DevOps pipeline YAML (`build-app.yaml`, `deploy-app.yaml`) apps use for CI/CD. Config only, no code. | YAML | — |

## Relationships

- `backend` is the SDK; `codelists` and `fileanalyzers` are optional feature libraries an app registers
  via DI. `frontend` is the UI that renders against a `backend`-based app.
- `template` composes `backend` (+ optionally the feature libs) and `frontend` into the skeleton the
  Designer generates apps from.
- The backend's process/workflow layer integrates with the Runtime [`workflow-engine`](../Runtime/workflow-engine/AGENTS.md);
  see `backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md`.

## Build & test

Each sub-project builds independently — open its `AGENTS.md` for exact commands. The dominant entry
points:

- `backend`: `dotnet build/test solutions/All.slnx` (CSharpier enforced on build). See [backend/AGENTS.md](backend/AGENTS.md).
- `frontend`: `yarn build` / `yarn test`. See [frontend/AGENTS.md](frontend/AGENTS.md).
- `codelists` / `fileanalyzers`: `dotnet build <name>.slnx` + `dotnet test` in each folder.
