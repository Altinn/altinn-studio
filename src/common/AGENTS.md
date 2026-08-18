# AGENTS.md — Repository-wide common code (`src/common`)

Code shared across product areas lives here, grouped by technology stack. Code shared only within one
product area belongs in that area's own `common/` directory, such as [`src/Runtime/common`](../Runtime/common/AGENTS.md).

See the root [`/AGENTS.md`](../../AGENTS.md) for the wider picture.

## Stacks

| Folder | What it contains | Build guidance |
| --- | --- | --- |
| [`dotnet/Altinn.Studio.Common`](dotnet/Altinn.Studio.Common/) | Dependency-light .NET hosting and assertion helpers shared across product areas. | Build `Altinn.Studio.Common.csproj` from that directory. |
| [`dotnet/Altinn.Studio.MaskinportenRules`](dotnet/Altinn.Studio.MaskinportenRules/) | The single definition of the v9 Maskinporten configuration invariants, shared by the app Roslyn analyzer and studioctl's v8→v9 upgrade detectors. | Build `Altinn.Studio.MaskinportenRules.csproj` from that directory. |
| [`ts`](ts/AGENTS.md) | React and TypeScript libraries shared by App Frontend, Designer, and other consumers. | Follow the TypeScript-specific instructions. |

Add a stack directory only when shared code for that stack exists. Keep packages focused and use
ecosystem-native project boundaries rather than creating a generic utilities package.

## Working here

- A change under `src/common` can affect several independently built products; verify every affected
  consumer and its container build.
- Shared .NET sources must remain consumable both through the project and through direct source
  inclusion. Do not rely on project-provided implicit or global usings, and verify representative
  source-consuming projects alongside the standalone project.
- Keep public surfaces small and dependencies explicit.
- Place code shared only within a product area under `src/<Area>/common/<stack>`.

## `Altinn.Studio.MaskinportenRules`

Consumed only through direct source inclusion, by two projects that cannot reference each other:
`src/App/backend/src/Altinn.App.Analyzers` (rules ALTINNAPP0800–0802, shipped with `Altinn.App.Api`) and
`src/cli/studioctl-server`'s v8→v9 upgrade detectors. Keeping one definition is what stops the upgrade
tooling and the analyzer that runs in every app from giving contradictory advice.

The Roslyn analyzer is the binding constraint, so the sources must stay **netstandard2.0 API surface,
C# 12, explicit usings, no IO or environment access** (RS1035), and free of external dependencies — pure
data and functions. The standalone project pins that floor; build it while editing from the project
directory, so its own `global.json` selects the SDK:

```bash
cd dotnet/Altinn.Studio.MaskinportenRules
dotnet build
```

The sources must also not assume whether a consumer scans JSON documents, syntax trees, or semantic
models. Verify both consumers when they change.
