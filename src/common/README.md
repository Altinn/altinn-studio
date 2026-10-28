# Shared code

Code that several product areas share, grouped by stack. Code that only one area shares goes in that area's own
`common` directory, such as [src/Runtime/common](../Runtime/common/README.md).

- [dotnet/Altinn.Studio.Common](dotnet/Altinn.Studio.Common/Altinn.Studio.Common.csproj) has .NET hosting and
  assertion helpers. Designer, the gateway, the workflow engine and kubernetes-wrapper reference the project. The App
  backend compiles single source files from it into its own assembly.
- [go](go/README.md) has the OpenTelemetry setup that Go services share.
- [expression-tests](expression-tests/README.md) has the expression tests that both the App frontend and the App
  backend run.
- [ts](ts/README.md) has the TypeScript and React libraries for app forms.

The products build and ship separately, so a change here can break several of them. Build and test each product that
uses the code you change, including its container image, since a Dockerfile copies only the shared paths it knows
about.

Because the App backend compiles the .NET source files directly, they cannot rely on implicit or global usings from
the project. Build the App backend as well as the project when you change them.

Keep each package focused, with a small public surface and explicit dependencies. Use the project boundaries of each
stack rather than a general utilities package.
