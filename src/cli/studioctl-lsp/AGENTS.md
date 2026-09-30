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
- `SchemaSetLoader.cs` — loads the schema set for the app's frontend version in the background, through the
  schema lookup `studioctl-server` passes in.

## Hosting

The server is compiled into `studioctl-server` and started with the `lsp` argument
(`../studioctl-server/Program.cs`). `studioctl app lsp` (`../internal/cmd/app_lsp.go`) execs the installed
server binary with stdio attached. Logging goes to stderr because stdout carries the protocol.
`studioctl-server` owns app-dist: it reads `STUDIOCTL_APP_DIST_CACHE`, fetches and caches schema sets per app
version in `AppDistSchemasService`, and passes `LspServer` that service's lookup. The language server and the
shared libraries never read the environment or talk to the registry.

## Build & test

From `src/cli`:

```bash
dotnet build studioctl.slnx
dotnet test studioctl.slnx        # server tests live in ../studioctl-lsp-tests
make test                         # what CI runs
```

## Changelog & releases

Changes here are studioctl changes and belong in `src/cli/CHANGELOG.md`.

## Working here

- Keep protocol concerns here and app-config knowledge in `Altinn.Studio.AppConfig`. A new rule or
  symbol kind belongs in the library, not in the server.
