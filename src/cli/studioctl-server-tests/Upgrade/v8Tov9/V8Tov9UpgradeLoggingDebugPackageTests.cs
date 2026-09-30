using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// End-to-end wiring checks for the Logging.Debug package removal step: an explicit
/// <c>Microsoft.Extensions.Logging.Debug</c> reference collides with the provider now built into
/// .NET 10's shared framework (CS0433, ambiguous <c>DebugLoggerProvider</c>), so the v9 upgrade must
/// remove it.
/// <para>
/// The csproj version/framework upgrade is skipped so the run stays offline and local: that path
/// resolves the latest v9 package versions and shells out to <c>dotnet restore</c>, neither of which
/// this is testing.
/// </para>
/// </summary>
public sealed class V8Tov9UpgradeLoggingDebugPackageTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<string> RunUpgrade()
    {
        var report = new UpgradeReport();
        var error = new StringWriter();

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
                Error: error,
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        var reported = report.Steps.SelectMany(step =>
            step.Messages.Select(message => message.Text).Prepend(step.Name)
        );
        return string.Join(Environment.NewLine, reported) + error.ToString();
    }

    [Fact]
    public async Task Upgrade_RemovesExplicitLoggingDebugPackageReference()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
                <PackageReference Include="Microsoft.Extensions.Logging.Debug" Version="6.0.0" />
              </ItemGroup>
            </Project>
            """
        );

        var log = await RunUpgrade();

        Assert.Contains("Microsoft.Extensions.Logging.Debug package reference removed", log, StringComparison.Ordinal);
        Assert.DoesNotContain("Logging.Debug", _app.Read("App.csproj"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Upgrade_OnAnAppWithNoLoggingDebugReference_SkipsTheStep()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );

        var log = await RunUpgrade();

        Assert.Contains("No Microsoft.Extensions.Logging.Debug package reference", log, StringComparison.Ordinal);
    }
}
