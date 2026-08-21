using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.ProjectFile;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the actual csproj output of <see cref="ProjectFileRewriter.Upgrade"/> for the project
/// shapes that <c>ProjectChecks</c> now accepts as 8.x (NuGet range/bracket syntax, and an app
/// that only declares Altinn.App.Api explicitly).
/// </summary>
public sealed class ProjectFileRewriterTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private static string? VersionOf(XDocument doc, string packageId) =>
        doc.Descendants("PackageReference")
            .SingleOrDefault(e => e.Attribute("Include")?.Value == packageId)
            ?.Attribute("Version")
            ?.Value;

    [Theory]
    [InlineData("[8.11.3]")]
    [InlineData("[8.0,9.0)")]
    [InlineData("8.*")]
    public async Task Upgrade_NormalizesNuGetRangeSyntax_ToPlainTargetVersion(string sourceVersion)
    {
        var csproj = _app.Write(
            "App.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{sourceVersion}" />
                <PackageReference Include="Altinn.App.Core" Version="{sourceVersion}" />
              </ItemGroup>
            </Project>
            """
        );

        await new ProjectFileRewriter(csproj, targetVersion: "9.0.5", targetFramework: "net10.0").Upgrade();

        var doc = XDocument.Load(csproj);
        // The range/bracket syntax must be fully replaced, not merely widened or left in place -
        // a leftover "[9.0.5]" or "[8.0,9.0)" would still restore, but would silently re-trigger
        // the same "not a supported source version" gate on the *next* upgrade attempt.
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Api"));
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Core"));
    }

    [Fact]
    public async Task Upgrade_LeavesAltinnAppCoreUndeclared_WhenOnlyApiWasPresent()
    {
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="[8.11.3]" />
              </ItemGroup>
            </Project>
            """
        );

        await new ProjectFileRewriter(csproj, targetVersion: "9.0.5", targetFramework: "net10.0").Upgrade();

        var doc = XDocument.Load(csproj);
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Api"));
        // ProjectChecks accepts this shape without an explicit Altinn.App.Core reference, since
        // Api pulls in a compatible Core transitively - but the rewriter has no logic to add one.
        // The app is left depending on Api's v9 Core floor implicitly; document that explicitly
        // here so a future change to either side doesn't silently drift out of sync.
        Assert.Null(VersionOf(doc, "Altinn.App.Core"));
        Assert.DoesNotContain(
            doc.Descendants("PackageReference"),
            e => e.Attribute("Include")?.Value == "Altinn.App.Core"
        );
    }

    [Fact]
    public async Task Upgrade_AlwaysBumpsExplicitCoreReference_RegardlessOfSourceVersion()
    {
        // ProjectChecks would already reject this project (Core explicitly 7.x fails the gate),
        // but the rewriter itself has no such gate - it must not be asked to run against project
        // shapes ProjectChecks rejects. This pins today's (unconditional) rewrite behavior.
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.11.3" />
                <PackageReference Include="Altinn.App.Core" Version="7.5.0" />
              </ItemGroup>
            </Project>
            """
        );

        await new ProjectFileRewriter(csproj, targetVersion: "9.0.5", targetFramework: "net10.0").Upgrade();

        var doc = XDocument.Load(csproj);
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Api"));
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Core"));
    }
}
