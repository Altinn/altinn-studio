using System.Reflection;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

namespace Studioctl.Tests.Upgrade.v8Tov9.KnownScenarios;

/// <summary>
/// The registry of known scenarios and its step in the upgrade pipeline. The scenarios themselves are tested on their
/// own.
/// </summary>
public sealed class KnownScenarioMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public void TheRegistryHoldsEveryScenario_OnceEach()
    {
        Type?[] types;
        try
        {
            types = typeof(IKnownScenario).Assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            // The test host cannot load every type of the server, such as those built on Microsoft.Build.
            types = ex.Types;
        }

        var scenarios = types
            .OfType<Type>()
            .Where(static type =>
                type is { IsClass: true, IsAbstract: false } && type.IsAssignableTo(typeof(IKnownScenario))
            )
            .Select(static type => type.FullName)
            .Order(StringComparer.Ordinal);
        var registered = KnownScenarioMigration
            .All.Select(static scenario => scenario.GetType().FullName)
            .Order(StringComparer.Ordinal);
        Assert.NotEmpty(scenarios);
        Assert.Equal(scenarios, registered);
    }

    /// <summary>The run is offline and has no compilation of the app, so the step says it checked nothing.</summary>
    [Fact]
    public async Task WithoutTheV8Compilation_TheStepSaysNothingWasChecked_BetweenThePdfFormatterAndOpenApiSteps()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.12.7" />
                <PackageReference Include="Altinn.App.Core" Version="8.12.7" />
              </ItemGroup>
            </Project>
            """
        );
        var report = new UpgradeReport();

        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: new StringWriter(),
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        var steps = report.Steps.Select(static step => step.Name).ToList();
        var step = Assert.Single(report.Steps, static step => step.Name == "Known scenarios");
        Assert.Equal(
            [new UpgradeMessage("Not checked without the app's v8 compilation", UpgradeMessageStatus.Skip)],
            step.Messages
        );
        Assert.Equal(steps.IndexOf("Unused IPdfFormatter") + 1, steps.IndexOf("Known scenarios"));
    }
}
