using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CompanionPackageMigrationTests : IDisposable
{
    private const string LatestCodelists = "9.0.0-preview.3";
    private const string LatestFileAnalyzers = "9.0.0-preview.2";

    private readonly TempAppFolder _app = new();
    private readonly List<string> _lookups = [];

    public void Dispose() => _app.Dispose();

    private string WriteProject(string references) =>
        _app.Write(
            "App.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="9.0.0-preview.10" />
                {references}
              </ItemGroup>
            </Project>
            """
        );

    private Task<MigrationResult> Migrate(string projectFile, bool published = true) =>
        new CompanionPackageMigration(
            projectFile,
            targetMajorVersion: 9,
            (packageId, _, _) =>
            {
                _lookups.Add(packageId);
                if (!published)
                    return Task.FromResult<string?>(null);
                return Task.FromResult<string?>(
                    packageId == "Altinn.Codelists" ? LatestCodelists : LatestFileAnalyzers
                );
            }
        ).MigrateAsync(TestContext.Current.CancellationToken);

    private string? VersionOf(string packageId) =>
        XDocument
            .Parse(_app.Read("App.csproj"))
            .Descendants("PackageReference")
            .Single(reference => reference.Attribute("Include")?.Value == packageId)
            .Attribute("Version")
            ?.Value;

    [Fact]
    public async Task MovesV8ReleasesToTheLatestV9ReleaseAndChangesNothingOnRerun()
    {
        var project = WriteProject(
            """
            <PackageReference Include="Altinn.Codelists" Version="8.0.3" />
            <PackageReference Include="altinn.fileanalyzers" Version="[8.0.0]" />
            """
        );

        var result = await Migrate(project);

        Assert.Equal(LatestCodelists, VersionOf("Altinn.Codelists"));
        Assert.Equal(LatestFileAnalyzers, VersionOf("altinn.fileanalyzers"));
        Assert.Equal("9.0.0-preview.10", VersionOf("Altinn.App.Api"));
        Assert.Equal(
            [
                new UpgradeMessage($"Altinn.Codelists moved from 8.0.3 to {LatestCodelists}", UpgradeMessageStatus.Ok),
                new UpgradeMessage(
                    $"Altinn.FileAnalyzers moved from [8.0.0] to {LatestFileAnalyzers}",
                    UpgradeMessageStatus.Ok
                ),
            ],
            result.Messages
        );

        var upgraded = _app.ReadBytes("App.csproj");
        _lookups.Clear();
        var rerun = await Migrate(project);

        Assert.Equal(upgraded, _app.ReadBytes("App.csproj"));
        Assert.Empty(_lookups);
        Assert.All(rerun.Messages, message => Assert.Equal(UpgradeMessageStatus.Skip, message.Status));
        Assert.Contains(
            new UpgradeMessage($"Altinn.Codelists is already on {LatestCodelists}", UpgradeMessageStatus.Skip),
            rerun.Messages
        );
    }

    [Theory]
    [InlineData("9.0.0-preview.1")]
    [InlineData("8.*")]
    [InlineData("[8.0,)")]
    [InlineData("*")]
    public async Task RaisesVersionsThatCanResolveToAReleaseThatDoesNotWorkWithV9(string version)
    {
        var project = WriteProject($"<PackageReference Include=\"Altinn.Codelists\" Version=\"{version}\" />");

        var result = await Migrate(project);

        Assert.Equal(LatestCodelists, VersionOf("Altinn.Codelists"));
        Assert.False(result.RequiresManualFollowUp);
    }

    [Theory]
    [InlineData("9.0.0-preview.2")]
    [InlineData("[9.0.0-preview.2]")]
    [InlineData("9.*")]
    [InlineData("10.0.0")]
    public async Task KeepsVersionsThatWorkWithV9(string version)
    {
        var project = WriteProject($"<PackageReference Include=\"Altinn.Codelists\" Version=\"{version}\" />");
        var original = _app.ReadBytes("App.csproj");

        var result = await Migrate(project);

        Assert.Equal(original, _app.ReadBytes("App.csproj"));
        Assert.Empty(_lookups);
        Assert.Equal(
            [new UpgradeMessage($"Altinn.Codelists is already on {version}", UpgradeMessageStatus.Skip)],
            result.Messages
        );
    }

    [Fact]
    public async Task AppWithoutThePackagesIsLeftAloneWithoutALookup()
    {
        var project = WriteProject("");
        var original = _app.ReadBytes("App.csproj");

        var result = await Migrate(project);

        Assert.Equal(original, _app.ReadBytes("App.csproj"));
        Assert.Empty(_lookups);
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task NoV9ReleaseInTheSourcesKeepsTheReferenceAndAsksForTheMove()
    {
        var project = WriteProject("<PackageReference Include=\"Altinn.Codelists\" Version=\"8.0.3\" />");
        var original = _app.ReadBytes("App.csproj");

        var result = await Migrate(project, published: false);

        Assert.Equal(original, _app.ReadBytes("App.csproj"));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("Move Altinn.Codelists from 8.0.3 to 9.0.0-preview.2 or later", todo, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("<PackageReference Include=\"Altinn.FileAnalyzers\" />")]
    [InlineData("<PackageReference Include=\"Altinn.FileAnalyzers\" Version=\"$(FileAnalyzersVersion)\" />")]
    public async Task VersionTheUpgradeCannotReadIsKeptAndNamesTheVersionToUse(string reference)
    {
        var project = WriteProject(reference);
        var original = _app.ReadBytes("App.csproj");

        var result = await Migrate(project);

        Assert.Equal(original, _app.ReadBytes("App.csproj"));
        var todo = Assert.Single(result.Todos);
        Assert.Contains(
            $"Make sure Altinn.FileAnalyzers resolves to {LatestFileAnalyzers}",
            todo,
            StringComparison.Ordinal
        );
    }

    [Theory]
    [InlineData("8.0.3", true)]
    [InlineData("9.0.0-preview.2", false)]
    public async Task ReferenceInDirectoryBuildPropsIsLeftForTheDeveloper(string version, bool expectTodo)
    {
        _app.Write(
            "Directory.Build.props",
            $"<Project><ItemGroup><PackageReference Include=\"Altinn.Codelists\" Version=\"{version}\" /></ItemGroup></Project>"
        );
        var project = WriteProject("");
        var original = _app.ReadBytes("App.csproj");

        var result = await Migrate(project);

        Assert.Equal(original, _app.ReadBytes("App.csproj"));
        Assert.Equal(expectTodo, result.RequiresManualFollowUp);
        if (expectTodo)
            Assert.Contains(
                $"Set Altinn.Codelists to {LatestCodelists} in Directory.Build.props",
                Assert.Single(result.Todos),
                StringComparison.Ordinal
            );
        else
            Assert.Empty(_lookups);
    }
}
