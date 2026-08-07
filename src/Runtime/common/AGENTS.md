# AGENTS.md — Runtime common code (`src/Runtime/common`)

Code shared within the Runtime and local-runtime area lives here, grouped by technology stack. The .NET
project is `Altinn.Studio.Runtime.Common`; repository-wide code belongs in [`src/common`](../../common/AGENTS.md).

See the Runtime [`AGENTS.md`](../AGENTS.md) and root [`/AGENTS.md`](../../../AGENTS.md) for the wider picture.

## .NET

`dotnet/Altinn.Studio.Runtime.Common` targets .NET 8 so it can be referenced by both Localtest (.NET 8)
and studioctl-server (.NET 10). It contains two cross-language local-runtime capabilities:

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
- When a cross-language behavior changes, update and verify both the .NET and Go implementations.
- Add another stack directory only when shared Runtime code for that stack actually exists.
