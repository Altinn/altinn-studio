# AGENTS.md — Altinn.Studio.Runtime.Common (`src/common`)

A small shared .NET class library (`Altinn.Studio.Runtime.Common`, references
`Microsoft.AspNetCore.App`) of **runtime hosting helpers** used by the Runtime services — notably the
[workflow-engine](../Runtime/workflow-engine/AGENTS.md) and the [gateway](../Runtime/gateway/AGENTS.md).

See the root [`/AGENTS.md`](../../AGENTS.md) for the wider picture.

## What's here

The library is intentionally tiny — three source files under `src/`:

- `Hosting.cs` — common `WebApplicationBuilder` configuration (e.g. header forwarding, graceful
  shutdown).
- `Ports.cs` — Kestrel public/internal port configuration and endpoint filters.
- `Assert.cs` — an always-on assertion helper.

## Build & test

A class library with no standalone solution or tests — it is built as part of each consuming service
(build/test the workflow-engine or gateway to exercise it). To compile it in isolation:

```bash
dotnet build Altinn.Studio.Runtime.Common.csproj    # from src/common
```

## Working here

- This is shared infrastructure: a change here can affect every Runtime service that references it, so
  keep the surface small and dependency-light, and build a consumer (workflow-engine/gateway) to catch
  breakage.
