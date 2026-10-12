using System.Text;
using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.ProjectFile;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers project-file edits, package-version preservation, and repeat upgrades.
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

        await new ProjectFileRewriter(csproj, targetVersion: "9.0.5", targetFramework: "net11.0").Upgrade(
            cancellationToken: TestContext.Current.CancellationToken
        );

        var doc = XDocument.Load(csproj);
        // The range/bracket syntax must be fully replaced, not merely widened or left in place -
        // a leftover "[9.0.5]" or "[8.0,9.0)" would still restore, but would silently re-trigger
        // the same "not a supported source version" gate on the *next* upgrade attempt.
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Api"));
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Core"));
        Assert.Equal("net11.0", doc.Descendants("TargetFramework").Single().Value);
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

        await new ProjectFileRewriter(csproj, targetVersion: "9.0.5", targetFramework: "net10.0").Upgrade(
            cancellationToken: TestContext.Current.CancellationToken
        );

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

        await new ProjectFileRewriter(csproj, targetVersion: "9.0.5", targetFramework: "net10.0").Upgrade(
            cancellationToken: TestContext.Current.CancellationToken
        );

        var doc = XDocument.Load(csproj);
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Api"));
        Assert.Equal("9.0.5", VersionOf(doc, "Altinn.App.Core"));
    }

    [Fact]
    public async Task SetTargetFramework_UpdatesTheFrameworkAndIsIdempotent()
    {
        var path = _app.Write(
            "App.csproj",
            "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>"
        );

        await new ProjectFileRewriter(path, targetFramework: "net11.0").SetTargetFramework(
            TestContext.Current.CancellationToken
        );
        Assert.Equal("net11.0", XDocument.Load(path).Descendants("TargetFramework").Single().Value);

        var rewritten = await File.ReadAllBytesAsync(path, TestContext.Current.CancellationToken);
        await new ProjectFileRewriter(path, targetFramework: "net11.0").SetTargetFramework(
            TestContext.Current.CancellationToken
        );
        Assert.Equal(rewritten, await File.ReadAllBytesAsync(path, TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData("9.0.0-preview.7", "9.0.0-preview.9", "9.0.0-preview.8", "9.0.0-preview.9")]
    [InlineData("9.0.0-preview.9", "9.0.0-preview.7", "9.0.0-preview.9", "9.0.0-preview.8")]
    [InlineData("[9.0.0-preview.9]", "9.0.0-preview.7", "[9.0.0-preview.9]", "9.0.0-preview.8")]
    public async Task Upgrade_RaisesOlderReferencesPreservesNewerPinsAndIsIdempotent(
        string apiVersion,
        string coreVersion,
        string expectedApi,
        string expectedCore
    )
    {
        var path = _app.Write(
            "App.csproj",
            $"""
            <Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{apiVersion}" />
                <PackageReference Include="Altinn.App.Core" Version="{coreVersion}" />
              </ItemGroup>
            </Project>
            """
        );

        await new ProjectFileRewriter(path, targetVersion: "9.0.0-preview.8", targetFramework: "net11.0").Upgrade(
            preserveNewerPackageVersions: true,
            cancellationToken: TestContext.Current.CancellationToken
        );

        var doc = XDocument.Load(path);
        Assert.Equal("net11.0", doc.Descendants("TargetFramework").Single().Value);
        Assert.Equal(expectedApi, VersionOf(doc, "Altinn.App.Api"));
        Assert.Equal(expectedCore, VersionOf(doc, "Altinn.App.Core"));
        var rewritten = _app.ReadBytes("App.csproj");

        await new ProjectFileRewriter(path, targetVersion: "9.0.0-preview.8", targetFramework: "net11.0").Upgrade(
            preserveNewerPackageVersions: true,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(rewritten, _app.ReadBytes("App.csproj"));
    }

    [Fact]
    public async Task ConvertToProjectReferences_UpdatesFrameworkKeepsOtherPackagesAndIsIdempotent()
    {
        var path = WriteConvertibleProject();
        var packages = new[] { "Altinn.App.Api", "Altinn.App.Core" };
        foreach (var package in packages)
            _app.Write($"../src/App/backend/src/{package}/{package}.csproj", "<Project />");

        await new ProjectFileRewriter(path, targetFramework: "net11.0").ConvertToProjectReferences(
            _app.Root,
            TestContext.Current.CancellationToken
        );

        var doc = XDocument.Load(path);
        Assert.Equal("net11.0", doc.Descendants("TargetFramework").Single().Value);
        Assert.Equal("1.0.0", VersionOf(doc, "Other.Package"));
        Assert.Single(doc.Descendants("PackageReference"));
        Assert.Equal(
            packages.Select(package =>
                Path.GetRelativePath(
                    Path.Combine(_app.Root, "App"),
                    Path.Combine(_app.Root, "src", "App", "backend", "src", package, package + ".csproj")
                )
            ),
            doc.Descendants("ProjectReference")
                .Select(reference => reference.Attribute("Include")?.Value)
                .Order(StringComparer.Ordinal)
        );
        var rewritten = _app.ReadBytes("App.csproj");

        await new ProjectFileRewriter(path, targetFramework: "net11.0").ConvertToProjectReferences(
            _app.Root,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(rewritten, _app.ReadBytes("App.csproj"));
    }

    [Fact]
    public async Task ConvertToProjectReferences_MissingSourceProjectPreservesFrameworkAndReferences()
    {
        var path = WriteConvertibleProject();
        _app.Write("../src/App/backend/src/Altinn.App.Core/Altinn.App.Core.csproj", "<Project />");
        var original = _app.ReadBytes("App.csproj");

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new ProjectFileRewriter(path, targetFramework: "net11.0").ConvertToProjectReferences(
                _app.Root,
                TestContext.Current.CancellationToken
            )
        );

        Assert.Contains("Altinn.App.Api.csproj", exception.Message, StringComparison.Ordinal);
        Assert.Equal(original, _app.ReadBytes("App.csproj"));
    }

    [Fact]
    public async Task Upgrade_CancellationPreservesFrameworkAndReferences()
    {
        var path = WriteConvertibleProject();
        var original = _app.ReadBytes("App.csproj");
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            new ProjectFileRewriter(path, targetVersion: "9.0.0-preview.8", targetFramework: "net11.0").Upgrade(
                cancellationToken: cancellation.Token
            )
        );

        Assert.Equal(original, _app.ReadBytes("App.csproj"));
    }

    [Fact]
    public async Task SetTargetFramework_SerializationFailureRestoresOriginalBytes()
    {
        byte[] original =
        [
            0xEF,
            0xBB,
            0xBF,
            .. Encoding.UTF8.GetBytes(
                "<Project>\r\n  <PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup>\r\n</Project>\r\n"
            ),
        ];
        var path = _app.WriteBytes("App.csproj", original);

        // XmlWriter rejects this character after opening the output file.
        await Assert.ThrowsAsync<ArgumentException>(() =>
            new ProjectFileRewriter(path, targetFramework: "net11.0\u0001").SetTargetFramework(
                TestContext.Current.CancellationToken
            )
        );

        Assert.Equal(original, _app.ReadBytes("App.csproj"));
    }

    private string WriteConvertibleProject() =>
        _app.Write(
            "App.csproj",
            """
            <Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="9.0.0-preview.7" />
                <PackageReference Include="Altinn.App.Core" Version="9.0.0-preview.7" />
                <PackageReference Include="Other.Package" Version="1.0.0" />
              </ItemGroup>
            </Project>
            """
        );

    [Theory]
    [InlineData("swashbuckle.aspnetcore", "Swashbuckle.AspNetCore")]
    [InlineData("microsoft.extensions.logging.debug", "Microsoft.Extensions.Logging.Debug")]
    public async Task RemovePackageReference_MatchesNuGetIdsCaseInsensitively(string declared, string requested)
    {
        var path = _app.Write(
            "App.csproj",
            $"<Project><ItemGroup><PackageReference Include=\"{declared}\" Version=\"1.0.0\" /></ItemGroup></Project>"
        );
        Assert.True(await new ProjectFileRewriter(path).RemovePackageReference(requested));
        Assert.Empty(XDocument.Load(path).Descendants("PackageReference"));
    }
}
