using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// End-to-end wiring checks for the implicit usings step: the v9 upgrade switches on the SDK's
/// implicit usings and adds <c>Altinn.App.Core.Features</c> as a global using, and reports that it
/// did so. The csproj version/framework upgrade is skipped so the run stays offline and local.
/// </summary>
public sealed class V8Tov9UpgradeImplicitUsingsTests : IDisposable
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
    public async Task Upgrade_EnablesImplicitUsings_AndAddsFeaturesAsAGlobalUsing()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );

        var log = await RunUpgrade();

        Assert.Contains("ImplicitUsings enabled in the project file", log, StringComparison.Ordinal);
        Assert.Contains("Altinn.App.Core.Features added as a global using", log, StringComparison.Ordinal);

        var csproj = _app.Read("App.csproj");
        Assert.Contains("<ImplicitUsings>enable</ImplicitUsings>", csproj, StringComparison.Ordinal);
        Assert.Contains("<Using Include=\"Altinn.App.Core.Features\" />", csproj, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Upgrade_RemovesUsingDirectives_TheNewGlobalUsingsMakeRedundant()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(
            "Program.cs",
            """
            using System;
            using System.Threading.Tasks;
            using Altinn.App.Api.Extensions;
            using Altinn.App.Core.Features;
            using Microsoft.Extensions.DependencyInjection;

            var builder = WebApplication.CreateBuilder(args);

            """
        );

        var log = await RunUpgrade();

        Assert.Contains("Removed 4 redundant using directive(s)", log, StringComparison.Ordinal);
        Assert.Equal(
            """
            using Altinn.App.Api.Extensions;

            var builder = WebApplication.CreateBuilder(args);

            """,
            _app.Read("Program.cs")
        );
    }

    [Fact]
    public async Task Upgrade_OnAnAppAlreadyUsingImplicitUsings_SkipsTheStep()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <ImplicitUsings>enable</ImplicitUsings>
              </PropertyGroup>
              <ItemGroup>
                <Using Include="Altinn.App.Core.Features" />
              </ItemGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
                <PackageReference Include="Altinn.App.Core" Version="9.0.0" />
              </ItemGroup>
            </Project>
            """
        );
        var before = _app.Read("App.csproj");

        var log = await RunUpgrade();

        Assert.Contains("Implicit usings already enabled", log, StringComparison.Ordinal);
        Assert.Equal(before, _app.Read("App.csproj"));
    }
}
