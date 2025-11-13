# How to contribute

Developer documentation for Altinn.App .NET libraries.

Here are some important resources:

  * [Team Apps Github board](https://github.com/orgs/Altinn/projects/39/views/2)
  * [Altinn Studio docs](https://docs.altinn.studio/)

## Reporting Issues

Open [our Github issue tracker](https://github.com/Altinn/app-lib-dotnet/issues/new/choose)
and choose an appropriate issue template.

Feel free to query existing issues before creating a new one.

## Repository setup

* Clone the repo
* Ensure .NET SDK is install (see `global.json` for  version)
* Ensure a container runtime is installed (e.g. Docker)
* `dotnet test`

## Contributing Changes

* Fork and/or create branch (make sure you've completed repository setup above)
* Push changes
* Test your changes, see the testing changes below
* Create PR - fill in the required sections
  * Try to provide reasoning/rationale for the changes if it hasn't already been discussed
  * Attach appropriate tags according to the change (`feature`, `kind/feature-request`, `bugfix`, `kind/bug`, `kind/chore`)
  * If you work on team Apps, attach the `Team Apps` project, add it to a sprint and input an estimate (if an issue isn't already added)
* Make sure coding style is consistent
  * Csharpier for formatting (`editor.formatOnSave` is on by default, there should be an extension for your editor/IDE)
  * EditorConfig is configured, you should use an editor or IDE that supports it (that should cover other conventions)
* We require 1 approval to merge changes
  * Make sure Sonar / CodeQL and other static analysis issues are resolved
    * We don't need 100% code coverage, effort and risk must be weighed
  * Use squash merge
  * Use a descriptive PR title, as it is used for release notes generation

### Versioning

We use semantic versioning. So we avoid breaking changes for anything that might break builds or change behavior.

### Telemetry

The Altinn app libraries are instrumented with `System.Diagnostics`, and telemetry is shipped via OpenTelemetry.
When developing new features and code, failure modes should be considered carefully, and telemetry should be added
such that we can observe that the code works correctly when running locally and in test and production environments.
See existing code for tips and clues.

Parts of the telemetry is considered public contract.
Consumers may build alerting and dashboards based on this telemetry, so if we change names and tags
that may break things downstream. Names and tags are in the `Telemetry` class.

### Testing

We have automated tests in the `test/` folder using mainly xUnit, Moq and Verify.
Some tests invoke classes directly (while mocking dependencies as needed),
while some construct adhoc DI containers or use ASP.NET Core `WebApplicationFactory<>`.
The following resources are currently snapshot tested (some with Verify)

* OpenAPI doc
* Telemetry output (activities/spans and metrics)

In addition to automated testing, we should do manual tests for any non-trivial change as well.

#### Manual testing

To manually test changes, simply make your app reference the libraries directly. See the diff below,
and make sure the relative directory paths work for your setup.

```csproj
<!-- <PackageReference Include="Altinn.App.Api" Version="8.2.*">
    <CopyToOutputDirectory>lib\$(TargetFramework)\*.xml</CopyToOutputDirectory>
</PackageReference>
<PackageReference Include="Altinn.App.Core" Version="8.2.*" /> -->
<ProjectReference Include="../../../app-lib-dotnet/src/Altinn.App.Api/Altinn.App.Api.csproj">
    <CopyToOutputDirectory>lib\$(TargetFramework)\*.xml</CopyToOutputDirectory>
</ProjectReference>
<ProjectReference Include="../../../app-lib-dotnet/src/Altinn.App.Core/Altinn.App.Core.csproj" />
```

Make sure [localtest](https://github.com/Altinn/app-localtest) is running
Run your app

```shell
dotnet run --project App/
```

To debug changes in the libraries, you can

* Add the `altinn-lib-donet/src` projects to your apps `App.sln` file
* Create a `code-workspace` file in the case of VSCode

Debug breakpoints should then work as normal
