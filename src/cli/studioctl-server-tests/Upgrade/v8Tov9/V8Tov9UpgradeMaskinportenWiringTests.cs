using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// End-to-end wiring checks for the Maskinporten steps: the detectors are unit-tested in isolation
/// elsewhere, and these confirm the upgrade actually runs them. A detector that works perfectly but is
/// never called from <see cref="V8Tov9Upgrade"/> is indistinguishable from no detector at all.
/// <para>
/// The csproj upgrade is skipped so the run stays offline and local: that path resolves the latest v9
/// package versions and shells out to <c>dotnet restore</c>, neither of which this is testing.
/// </para>
/// </summary>
public sealed class V8Tov9UpgradeMaskinportenWiringTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<string> RunUpgrade()
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
                // Keeps the run offline: semantic analysis shells out to `dotnet restore` and a
                // design-time build, neither of which this is testing.
                SkipSemanticAnalysis: true
            )
        );

        // The run reports into the report now, so flatten it - step names included, since a step name is
        // what tells the reader which job a message came from.
        var reported = report.Steps.SelectMany(step =>
            step.Messages.Select(message => message.Text).Prepend(step.Name)
        );
        return string.Join(Environment.NewLine, reported) + error.ToString();
    }

    [Fact]
    public async Task Upgrade_ReportsTheRemovedMaskinportenShim()
    {
        _app.Write(
            "logic/TokenLookup.cs",
            """
            using Altinn.App.Core.Internal.Maskinporten;
            public class TokenLookup
            {
                private readonly IMaskinportenTokenProvider _provider;
            }
            """
        );

        var log = await RunUpgrade();

        Assert.Contains("IMaskinportenTokenProvider", log, StringComparison.Ordinal);
        Assert.Contains("TokenLookup.cs", log, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Upgrade_ReportsTheExternalPackageWithoutItsOwnReference()
    {
        _app.Write("logic/Client.cs", "using Altinn.ApiClients.Maskinporten.Interfaces;");

        var log = await RunUpgrade();

        Assert.Contains("will not compile", log, StringComparison.Ordinal);
        Assert.Contains("Client.cs", log, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Upgrade_ReportsTheConfigurationSectionCollision()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "Environment": "test",
                "EncodedJwk": "eyJraWQiOiJ0ZXN0In0="
              }
            }
            """
        );

        var log = await RunUpgrade();

        Assert.Contains("Maskinporten settings", log, StringComparison.Ordinal);
        Assert.Contains("appsettings.json", log, StringComparison.Ordinal);
        Assert.Contains("Rename your own section", log, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Upgrade_OnAnAppWithNoMaskinportenUsage_StaysQuiet()
    {
        _app.Write("logic/MyService.cs", "public class MyService { }");
        _app.Write("appsettings.json", """{ "Logging": { "LogLevel": { "Default": "Information" } } }""");

        var log = await RunUpgrade();

        Assert.DoesNotContain("configures the external Maskinporten client", log, StringComparison.Ordinal);
        Assert.DoesNotContain("IMaskinportenTokenProvider", log, StringComparison.Ordinal);
        Assert.DoesNotContain("Altinn.ApiClients.Maskinporten", log, StringComparison.Ordinal);
    }
}
