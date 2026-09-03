# AGENTS.md — studioctl language server (`src/cli/studioctl-lsp`)

The language server behind `studioctl app lsp`: LSP over stdio for Altinn app configuration (application
metadata, layouts and layout settings, process definition, policy, text resources, options and C# data
models). It is a thin protocol layer over the shared `Altinn.Studio.AppConfig` engine in
[`../common`](../common/AGENTS.md), which owns parsing, the symbol model and the validation rules. JSON
schemas come from `Altinn.Studio.AppDist`, resolved per app frontend version.

See the studioctl [`AGENTS.md`](../AGENTS.md) and root [`/AGENTS.md`](../../../AGENTS.md) for the wider
picture.

## Layout

- `LspServer.cs`, `LspTransport.cs`, `Protocol.cs` — JSON-RPC transport and request dispatch.
- `WorkspaceState.cs` — overlays unsaved editor buffers on the app directory and rebuilds the model
  snapshot on change.
- `DiagnosticsPublisher.cs`, `LanguageFeatures.cs`, `LspConversions.cs`, `Utf16Mapper.cs` — map engine
  findings and symbols to LSP diagnostics, hover, completion, rename, references and code lenses.
- `SchemaSetLoader.cs`, `AppDistConfig.cs` — resolve the schema set for the app's frontend version
  through app-dist.
- `vscode/` — the VS Code extension (TypeScript, published as `altinnstudio.altinn-studio-lsp`).
- `rider/` — the JetBrains plugin (Kotlin, Gradle, LSP4IJ). Both clients launch `studioctl app lsp`, so
  `studioctl` must be on `PATH`.

## Hosting

The server is compiled into `studioctl-server` and started with the `lsp` argument
(`../studioctl-server/Program.cs`). `studioctl app lsp` (`../internal/cmd/app_lsp.go`) execs the installed
server binary with stdio attached. Logging goes to stderr because stdout carries the protocol.

## Build & test

From `src/cli`:

```bash
dotnet build studioctl.slnx
dotnet test studioctl.slnx        # server tests live in ../studioctl-lsp-tests
make test                         # what CI runs
```

VS Code extension: `npm ci && npm run compile` in `vscode/`. JetBrains plugin: `./gradlew buildPlugin
verifyPlugin` in `rider/` (JDK 21).

## Changelog & releases

Each client is its own release component (`studioctl-vscode` and `studioctl-rider` in
`src/tools/releaser/internal/component.go`) with its own `CHANGELOG.md`. Merging a changelog-promotion PR
labeled `release/studioctl-vscode` or `release/studioctl-rider` triggers
`.github/workflows/release-studioctl-vscode.yaml` / `release-studioctl-rider.yaml`, which build the
artifact, attach it to the GitHub release and publish to the marketplace. Prereleases are published to
GitHub only for VS Code and to the EAP channel for JetBrains. Server-side changes are studioctl changes
and belong in `src/cli/CHANGELOG.md`.

## Working here

- Keep protocol concerns here and app-config knowledge in `Altinn.Studio.AppConfig`. A new rule or
  symbol kind belongs in the library, not in the server.
- Changes under `vscode/` or `rider/` still trigger `cli-changelog.yaml`; add a `src/cli/CHANGELOG.md`
  entry or apply the `skip-changelog` label.
