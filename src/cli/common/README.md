# studioctl common code

This directory holds .NET libraries from the studioctl area that other parts of Altinn Studio also use. Code that
the whole repository shares belongs in [`src/common`](../../common).

- [Altinn.Studio.AppDist](dotnet/Altinn.Studio.AppDist/README.md) fetches and caches the app frontend distribution
  that each app release [publishes as an OCI artifact](../../../.github/actions/publish-app-dist).
  [Designer's backend](../../Designer/backend/src/Designer/Designer.csproj) uses it, so it must not depend on
  studioctl-server.

## Development

- The projects belong to [studioctl's solution](../studioctl.slnx), so `make test` in `src/cli` tests them.
- Warnings are errors and all analyzer rules apply. Turn off a rule that does not fit these libraries in
  [`.editorconfig`](dotnet/.editorconfig), with a reason, rather than suppressing it in code.
- Async methods have no `Async` suffix.
- Designer's [Dockerfile](../../Designer/Dockerfile) and
  [migrations Dockerfile](../../Designer/backend/Migrations.Dockerfile) copy AppDist together with the build
  configuration it inherits from `src/cli`. Update them when that configuration gains a file.
