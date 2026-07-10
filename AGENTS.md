# AGENTS.md

This file provides guidance to AI agents working anywhere in this repository. It is the top of a
hierarchy: every major area has its own `AGENTS.md` with more detail, and the deeper you go, the more
specific the guidance becomes. Start here to orient, then open the `AGENTS.md` closest to the code you
are touching.

## Altinn Studio

Altinn Studio is a product for developing, operating, and managing public digital services for citizens
and businesses in Norway. It runs on a secure, isolated, scalable platform integrated with common shared
services and open APIs, and supports both user-facing submissions and machine-to-machine APIs.

You can build anything from simple form services to complex workflows with payments and signing. It is a
hybrid of low-code and traditional code, so you can start in Designer and switch to full-code tools when
needed. Key principles: open source, open standards, cloud-based infrastructure, modern frameworks,
built-in security, and tenant isolation.

Docs: https://docs.altinn.studio/nb/altinn-studio/v8/about/

### The three pillars of Altinn 3

- **Altinn Studio** — the tooling where developers build and deploy apps (the Designer product).
- **Altinn Apps** — the runtime an individual deployed service is built on (backend libraries + frontend).
- **Altinn Platform** — the shared cloud services apps depend on (Storage, Process, Authorization, …),
  emulated locally by `localtest`.

This monorepo contains the Studio tooling, the App runtime libraries, several runtime/platform services,
developer tooling, and the supporting infrastructure to run it all.

## Repository map

Nearly everything lives under `src/`; the one top-level code directory outside it is `app-libs/`.
Each area below links to its own `AGENTS.md` where one exists.

### Product surfaces

| Area                                     | What it is                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/Designer`](src/Designer/AGENTS.md) | **Altinn Studio Designer** — React + .NET web app where users build apps (forms, data models, policies, BPMN processes). Split into [`backend`](src/Designer/backend/AGENTS.md) (.NET) and [`frontend`](src/Designer/frontend/AGENTS.md) (React/TS).                                                                                                                                      |
| [`src/App`](src/App/AGENTS.md)           | The **Altinn 3 app runtime** every deployed service builds on: [`backend`](src/App/backend/AGENTS.md) (Altinn.App .NET libraries), [`frontend`](src/App/frontend/AGENTS.md) (React form renderer), plus support libs [`codelists`](src/App/codelists/AGENTS.md), [`fileanalyzers`](src/App/fileanalyzers/AGENTS.md), the [`template`](src/App/template/AGENTS.md), and `azure-pipelines`. |

### Runtime & platform services — [`src/Runtime`](src/Runtime/AGENTS.md)

| Area                                                               | What it is                                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| [`workflow-engine`](src/Runtime/workflow-engine/AGENTS.md)         | Reusable .NET class library for async workflow processing (engine, HTTP API, Postgres persistence, dashboard). |
| [`workflow-engine-app`](src/Runtime/workflow-engine-app/AGENTS.md) | Deployable host that composes `workflow-engine` and registers the Altinn `AppCommand`.                         |
| [`gateway`](src/Runtime/gateway/AGENTS.md)                         | .NET control-plane gateway between Studio and the runtime cluster (deploy/alerts/metrics).                     |
| [`operator`](src/Runtime/operator/AGENTS.md)                       | Go Kubernetes operator (Kubebuilder) managing Maskinporten clients via CRDs.                                   |
| [`pdf3`](src/Runtime/pdf3/AGENTS.md)                               | Go PDF-generation service driving headless Chrome, with PDF/A validation.                                      |
| [`localtest`](src/Runtime/localtest/AGENTS.md)                     | .NET service emulating Altinn Platform so apps can run locally.                                                |
| [`devenv`](src/Runtime/devenv/AGENTS.md)                           | Go container runtime fixture mirroring the real runtime for dev/tests.                                         |
| [`kubernetes-wrapper`](src/Runtime/kubernetes-wrapper/AGENTS.md)   | .NET REST API surfacing Kubernetes deployment state.                                                           |

### Developer tooling

| Area                               | What it is                                                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/cli`](src/cli/AGENTS.md)     | **`studioctl`** — the primary local-dev CLI (Go + an embedded .NET companion server) for cloning, running, and testing apps locally.                                                                              |
| [`src/tools`](src/tools/AGENTS.md) | Standalone tools: [`deployer`](src/tools/deployer/AGENTS.md), [`releaser`](src/tools/releaser/AGENTS.md), [`altinn-fleet-stats`](src/tools/altinn-fleet-stats/AGENTS.md), [`health`](src/tools/health/AGENTS.md). |

### AI — [`src/AI`](src/AI/AGENTS.md)

R&D projects from the AI lab (to be handed off to the Studio team): `agents` (Altinity natural-language
app builder), `mcp` (Altinity MCP server of Altinn-domain tools), `augmenter-agent` (document/PDF
augmentation microservice).

### Shared code

| Area                                 | What it is                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/common`](src/common/AGENTS.md) | `Altinn.Studio.Runtime.Common` — shared .NET hosting helpers used by the Runtime services.                                                                          |
| [`src/Shared`](src/Shared/AGENTS.md) | Cross-language shared contracts compiled into `studioctl-server`: `EnvTopology` (routing) and `HostBridge` (WebSocket tunnel protocol), each with a Go counterpart. |
| [`app-libs`](app-libs/AGENTS.md)     | TS/React libraries for apps (top level, not under `src/`), being extracted from `src/App/frontend`: `form-component`, `form-engine`, `language`.                    |

### Testing — [`src/test`](src/test/AGENTS.md)

`K6` load/performance scripts and `apps` (sample Altinn apps used as E2E/frontend test targets).

### Infrastructure (Docker/ops, no per-folder AGENTS.md)

Small build/ops images and configs, documented here rather than individually:

- `gitea` — custom image for the self-hosted Gitea (Studio's "Repositories" Git server).
- `gitea-proxy` — nginx+njs proxy restricting Gitea API-key/basic-auth to git + REST API only.
- `gitea-runner` — Gitea Actions CI runner image (also runs Renovate jobs).
- `github-runner` — self-hosted GitHub Actions runner image preloaded with Studio's toolchains.
- `runner-org-sync` — Go CronJob syncing the Altinn org list into per-org Gitea runners (KEDA scaling).
- `lhci-server` — Lighthouse CI server (Node + Postgres) tracking frontend performance.
- `load-balancer` — nginx edge proxy (with OpenTelemetry) fronting Studio services; local + k8s configs.

Other top-level dirs: `charts/` (Helm), `infra/` (deployment infra), `docs/` (ADRs, diagrams),
`scripts/`, and root Docker/compose files for the Designer dev stack (see `README.md`).

## Conventions across the repo

- **Docs:** `AGENTS.md` is the source of truth for agent guidance in a directory. Where a `CLAUDE.md`
  exists alongside it, that file just links to the `AGENTS.md` (`@AGENTS.md`) so Claude Code loads it.
  Never leave a directory with only a `CLAUDE.md` — always create the `AGENTS.md` and point `CLAUDE.md`
  at it. These invariants (pairing, resolvable links, root-map coverage of tracked directories) are
  enforced by `yarn docs:validate` in CI.
- **Languages/stacks vary by project:** .NET (C#), React/TypeScript, Go, and Python all appear here.
  Framework versions differ per project and are documented at the leaf, not here — check the project's
  own `AGENTS.md`, `global.json`, `go.mod`, or `pyproject.toml` before assuming a version.
- **Formatting/linting is enforced at build time** in most projects (CSharpier for .NET, ESLint/Prettier
  for TS, golangci-lint for Go). Follow the commands in the project's `AGENTS.md`/`Makefile`.
- **Prefer the guidance closest to the code.** More-specific `AGENTS.md` files override this one.
