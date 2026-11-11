using System.IO.Compression;
using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using NuGet.Versioning;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class V9PackageVersionResolverTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public void ResolveLatestTargetVersion_PrefersLatestStableVersion()
    {
        string[] apiVersions = ["9.0.0", "9.0.1", "9.1.0-preview.1"];
        string[] coreVersions = ["9.0.0", "9.0.1", "9.1.0-preview.1"];

        var version = V9PackageVersionResolver.ResolveLatestTargetVersion(
            apiVersions,
            coreVersions,
            9,
            "9.0.0-preview.8"
        );

        Assert.Equal("9.0.1", version);
    }

    [Fact]
    public void ResolveLatestTargetVersion_NoStableVersion_ReturnsLatestCommonPrerelease()
    {
        string[] apiVersions = ["9.0.0-preview.8", "9.0.0-preview.9", "9.0.0-preview.10"];
        string[] coreVersions = ["9.0.0-preview.8", "9.0.0-preview.9"];

        var version = V9PackageVersionResolver.ResolveLatestTargetVersion(
            apiVersions,
            coreVersions,
            9,
            "9.0.0-preview.8"
        );

        Assert.Equal("9.0.0-preview.9", version);
    }

    [Fact]
    public void ResolveLatestTargetVersion_SelectsACommonReleaseAtTheCompatibilityFloor()
    {
        string[] apiVersions = ["9.0.0-preview.7", "9.0.0-preview.8", "9.0.0-preview.9"];
        string[] coreVersions = ["9.0.0-preview.7", "9.0.0-preview.8"];

        var version = V9PackageVersionResolver.ResolveLatestTargetVersion(
            apiVersions,
            coreVersions,
            9,
            "9.0.0-preview.8"
        );

        Assert.Equal("9.0.0-preview.8", version);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void ResolveLatestTargetVersion_RejectsOlderReleasesAndPartialPublication(bool apiPublished)
    {
        string[] apiVersions = apiPublished ? ["9.0.0-preview.7", "9.0.0-preview.8"] : ["9.0.0-preview.7"];
        string[] coreVersions = ["9.0.0-preview.7"];

        var error = Assert.Throws<InvalidOperationException>(() =>
            V9PackageVersionResolver.ResolveLatestTargetVersion(apiVersions, coreVersions, 9, "9.0.0-preview.8")
        );

        Assert.Contains("at least 9.0.0-preview.8", error.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(new[] { "8.0.3", "9.0.0-preview.1", "9.0.0-preview.2", "10.0.0" }, "9.0.0-preview.2")]
    [InlineData(new[] { "9.0.0-preview.2", "9.0.0", "9.1.0-preview.1" }, "9.0.0")]
    [InlineData(new[] { "8.0.3", "9.0.0-preview.1" }, null)]
    public void SelectLatestVersion_PrefersStableAndNeverLeavesTheMajorVersionOrGoesBelowTheMinimum(
        string[] versions,
        string? expected
    )
    {
        Assert.Equal(
            expected,
            V9PackageVersionResolver.SelectLatestVersion(versions, 9, NuGetVersion.Parse("9.0.0-preview.2"))
        );
    }

    [Fact]
    public async Task ResolveLatestVersion_SearchesTheAppsNuGetSources()
    {
        var source = Path.Combine(_app.Root, "packages");
        Directory.CreateDirectory(source);
        foreach (var published in new[] { "8.0.3", "9.0.0-preview.1", "9.0.0-preview.2" })
            WritePackage(source, "Altinn.Codelists", published);
        new XDocument(
            new XElement(
                "configuration",
                new XElement(
                    "packageSources",
                    new XElement("clear"),
                    new XElement("add", new XAttribute("key", "fixture"), new XAttribute("value", source))
                )
            )
        ).Save(Path.Combine(_app.Root, "NuGet.Config"));
        _app.Write("App.csproj", "<Project />");

        var version = await V9PackageVersionResolver.ResolveLatestVersion(
            "Altinn.Codelists",
            Path.Combine(_app.Root, "App"),
            9,
            NuGetVersion.Parse("9.0.0-preview.1"),
            TestContext.Current.CancellationToken
        );

        Assert.Equal("9.0.0-preview.2", version);
    }

    private static void WritePackage(string source, string package, string version)
    {
        using var archive = ZipFile.Open(
            Path.Combine(source, package + "." + version + ".nupkg"),
            ZipArchiveMode.Create
        );
        using var writer = new StreamWriter(archive.CreateEntry(package + ".nuspec").Open());
        writer.Write(
            $"<package><metadata><id>{package}</id><version>{version}</version><authors>tests</authors><description>Offline fixture</description></metadata></package>"
        );
    }
}
