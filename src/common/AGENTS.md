# AGENTS.md — Repository-wide common code (`src/common`)

Code shared across product areas lives here, grouped by technology stack. Code shared only within one
product area belongs in that area's own `common/` directory, such as [`src/Runtime/common`](../Runtime/common/AGENTS.md).

See the root [`/AGENTS.md`](../../AGENTS.md) for the wider picture.

## Stacks

| Folder | What it contains | Build guidance |
| --- | --- | --- |
| [`dotnet/Altinn.Studio.Common`](dotnet/Altinn.Studio.Common/) | Dependency-light .NET hosting and assertion helpers shared across product areas. | Build `Altinn.Studio.Common.csproj` from that directory. |
| [`expression-tests`](expression-tests/README.md) | JSON expression evaluation and validation tests shared by the App frontend and backend. | Run both App frontend and backend expression test suites when changing these files. Platform-specific skips and their observed results are documented in the folder README. |
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
