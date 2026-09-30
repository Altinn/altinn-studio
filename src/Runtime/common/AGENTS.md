# AGENTS.md — Runtime common code (`src/Runtime/common`)

Code shared within the Runtime and local-runtime area lives here, grouped by technology stack. The .NET
project is `Altinn.Studio.Runtime.Common`; repository-wide code belongs in [`src/common`](../../common/AGENTS.md).

See the Runtime [`AGENTS.md`](../AGENTS.md) and root [`/AGENTS.md`](../../../AGENTS.md) for the wider picture.

## .NET

`dotnet/Altinn.Studio.Runtime.Common` targets .NET 10 as a standalone project. Localtest (.NET 8) and
studioctl-server (.NET 10) compile its source files directly, so the sources must remain compatible with
both consumer targets and must not rely on project-provided implicit or global usings. It contains two
cross-language local-runtime capabilities:

- `EnvTopology/` — bound-topology routing configuration. Its Go counterpart is
  `src/cli/internal/envtopology/`.
- `HostBridge/` — the HostBridge WebSocket protocol and HTTP header filtering. The Go implementation is
  split between `src/cli/internal/studioctlserver/client.go` and `src/cli/internal/cmd/server.go`.

Build the project directly with:

```bash
dotnet build dotnet/Altinn.Studio.Runtime.Common/Altinn.Studio.Runtime.Common.csproj
```

## Working here

- Keep shared projects small and dependency-light.
- Keep the .NET project consumable both as a project and through direct source inclusion; verify the
  standalone project, Localtest, and studioctl-server when its sources change.
- When a cross-language behavior changes, update and verify both the .NET and Go implementations.
- Add another stack directory only when shared Runtime code for that stack actually exists.
