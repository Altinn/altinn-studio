using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.ProjectFile;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class NuGetDowngradeResolverTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public void ParseDowngrades_ExtractsPackageAndRequiredFloor()
    {
        const string output = """
            /app/App.csproj : error NU1605: Detected package downgrade: Azure.Identity from 1.21.0 to 1.17.1
            /app/App.csproj : error NU1605: Detected package downgrade: Azure.Extensions.AspNetCore.Configuration.Secrets from 1.5.0 to 1.4.0
            """;

        var downgrades = NuGetDowngradeResolver.ParseDowngrades(output);

        Assert.Equal(2, downgrades.Count);
        var identity = downgrades.Single(d => d.PackageId == "Azure.Identity");
        Assert.Equal("1.21.0", identity.RequiredVersion);
        Assert.Equal("1.17.1", identity.CurrentVersion);
    }

    [Fact]
    public void ParseDowngrades_DeduplicatesRepeatedLines()
    {
        const string output = """
            Detected package downgrade: Azure.Identity from 1.21.0 to 1.17.1
            Detected package downgrade: Azure.Identity from 1.21.0 to 1.17.1
            """;

        var downgrades = NuGetDowngradeResolver.ParseDowngrades(output);

        Assert.Single(downgrades);
    }

    [Fact]
    public void ParseDowngrades_NoDowngrades_ReturnsEmpty()
    {
        Assert.Empty(NuGetDowngradeResolver.ParseDowngrades("Restore succeeded."));
    }

    [Fact]
    public async Task SetPackageReferenceVersions_RaisesExistingReferenceOnly()
    {
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Azure.Identity" Version="1.17.1" />
              </ItemGroup>
            </Project>
            """
        );

        var updated = await new ProjectFileRewriter(csproj).SetPackageReferenceVersions(
            new Dictionary<string, string> { ["Azure.Identity"] = "1.21.0", ["Not.Referenced"] = "9.9.9" }
        );

        Assert.Contains("Azure.Identity", updated);
        Assert.DoesNotContain("Not.Referenced", updated);

        var doc = XDocument.Load(csproj);
        var version = doc.Descendants("PackageReference")
            .Single(e => e.Attribute("Include")?.Value == "Azure.Identity")
            .Attribute("Version")
            ?.Value;
        Assert.Equal("1.21.0", version);
    }
}
