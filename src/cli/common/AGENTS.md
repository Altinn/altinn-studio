# AGENTS.md — studioctl common code (`src/cli/common`)

Code shared within the studioctl area lives here, grouped by technology stack. Repository-wide code
belongs in [`src/common`](../../common/AGENTS.md).

See the studioctl [`AGENTS.md`](../AGENTS.md) and root [`/AGENTS.md`](../../../AGENTS.md) for the wider
picture.

## .NET

The projects under `dotnet/` are ordinary members of `../studioctl.slnx` and inherit the studioctl
`Directory.Build.props`, `Directory.Packages.props`, `global.json`, `.editorconfig` and CSharpier
configuration. Test projects live under `dotnet/tests/` and use xunit v3, like `studioctl-server-tests`.

- `dotnet/Altinn.Studio.AppConfig` — parser, symbol model and validation rules for an Altinn app's
  configuration files, shared by the language server in [`../studioctl-lsp`](../studioctl-lsp/AGENTS.md),
  `studioctl app vet` and the studioctl-server validate endpoint. Rules live under `Validation/Rules` and
  are registered in `Validation/RuleRegistry.cs`.
- `dotnet/Altinn.Studio.AppDist` — fetches and caches the per-version Altinn app resource artifact
  (`ghcr.io/altinn/altinn-studio/app-dist`) published by `release-app.yaml`. An OCI layer is the unit of
  availability and caching; consumers ask for a version and get file entries back.

Build and test from `src/cli`:

```bash
dotnet build studioctl.slnx
dotnet test studioctl.slnx
```

## Working here

- Keep the libraries dependency-light and free of studioctl-server or LSP references; they are consumed
  by both.
- Changes here that alter studioctl behavior need a `src/cli/CHANGELOG.md` entry, like any other
  studioctl change (`cli-changelog.yaml` covers `src/cli/**`).
