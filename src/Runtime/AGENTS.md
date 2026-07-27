# AGENTS.md — Runtime & platform services (`src/Runtime`)

Runtime and platform services that support running Altinn 3 apps — both in production (workflow
processing, PDF generation, cluster integration) and locally (platform emulation, dev fixtures).

See the root [`/AGENTS.md`](../../AGENTS.md) for how this fits into Altinn 3 as a whole.

## Services

| Folder | What it is | Stack | Docs |
| --- | --- | --- | --- |
| `workflow-engine` | Reusable class library for async workflow processing: engine + processing loop, HTTP API, command plugin system, Postgres persistence (EF Core), resilience/concurrency, telemetry, dashboard, and a TestKit. Composed by hosts, not deployed directly. | .NET (C#) | [workflow-engine/AGENTS.md](workflow-engine/AGENTS.md) |
| `workflow-engine-app` | The deployable host that composes `workflow-engine` (`AddWorkflowEngine()`/`UseWorkflowEngine()`) and registers the Altinn-specific `AppCommand` HTTP callback. Owns runtime `appsettings*.json`. | .NET (C#) | [workflow-engine-app/AGENTS.md](workflow-engine-app/AGENTS.md) |
| `gateway` | Control-plane gateway between Studio/Designer and the runtime cluster; exposes Internal/Local/Public endpoint groups and clients for deploy/alerts/metrics. AOT-friendly. | .NET (C#) + Go tester | [gateway/AGENTS.md](gateway/AGENTS.md) |
| `operator` | Kubernetes operator for Altinn 3, primarily managing Maskinporten clients via CRDs/reconcilers. | Go (Kubebuilder) | [operator/AGENTS.md](operator/AGENTS.md) |
| `pdf3` | PDF-generation service: drives headless Chrome via CDP to render pages to PDF, deployed as proxy + worker, with veraPDF PDF/A validation. | Go (+ Node tooling) | [pdf3/AGENTS.md](pdf3/AGENTS.md) |
| `localtest` | Emulates the Altinn Platform services apps need, so developers can run/test apps locally without the cloud platform. Driven via Docker/Podman and `studioctl`. | .NET (C#) | [localtest/AGENTS.md](localtest/AGENTS.md) |
| `devenv` | Container runtime fixture mirroring the real runtime environment for development and tests. | Go | [devenv/AGENTS.md](devenv/AGENTS.md) |
| `kubernetes-wrapper` | REST API exposing information about Kubernetes deployments to other platform components. | .NET (C#) | [kubernetes-wrapper/AGENTS.md](kubernetes-wrapper/AGENTS.md) |

## Notes

- `workflow-engine` (library) and `workflow-engine-app` (host) are a matched pair — read the library's
  `AGENTS.md` first; the host inherits its conventions. The app-side integration lives in
  [`src/App/backend/.../WorkflowEngine`](../App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md).
- Several services share hosting helpers from [`src/common`](../common/AGENTS.md).
- Go services (`operator`, `pdf3`, `devenv`) and .NET services differ in build/test tooling — follow the
  project's own `AGENTS.md`/`README.md`/`Makefile`.
