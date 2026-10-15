# Workflow engine dashboard

The dashboard shows what the [workflow engine](../../../README.md) is doing in real time. It follows workflows
through their steps and shows a step's state and errors. An operator can retry or fail a step and override a
namespace's failure throttling.

The engine serves the dashboard at its root. The dashboard reads data from the engine's
[dashboard endpoints](../Endpoints/DashboardEndpoints.cs). Its workflow actions call the engine's
[public API](../../../docs/technical-guide.md#api-reference), like any other caller. Its trace links open Tempo in the
Grafana of the [local stack](../../../docs/docker.md).

[DASHBOARD_SPEC.md](DASHBOARD_SPEC.md) describes the dashboard's behavior in detail.

## Development

The browser loads these files directly as JavaScript modules. The engine embeds them in `WorkflowEngine.Core`. In
the Development and Docker environments it serves them from disk instead, and the page reloads when a file changes.
