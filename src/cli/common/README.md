# studioctl common code

.NET libraries from the studioctl area that other parts of Altinn Studio also use. Code that the whole repository
shares belongs in [src/common](../../common/README.md).

[Altinn.Studio.AppDist](dotnet/Altinn.Studio.AppDist/README.md) fetches and caches the app frontend distribution that
each app release [publishes as an OCI artifact](../../../.github/actions/publish-app-dist/action.yaml).
[Designer's backend](../../Designer/backend/src/Designer/Designer.csproj) uses it, so it must not depend on
`studioctl-server`.

## Development

- The projects belong to [studioctl's solution](../studioctl.slnx), so `make test` in `src/cli` tests them. The
  Designer backend workflows also run when they change.
- The libraries build with all analyzer rules and warnings as errors, also outside CI. Turn off a rule that does not
  fit them in [.editorconfig](dotnet/.editorconfig), with a reason, rather than suppressing it in code.
- Designer's [Dockerfile](../../Designer/Dockerfile) and
  [migrations Dockerfile](../../Designer/backend/Migrations.Dockerfile) copy AppDist together with the build
  configuration it inherits from `src/cli`. Update them when that configuration gains a file.
