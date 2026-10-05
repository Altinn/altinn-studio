using System.Text;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// A service owner's test project references the app project, so it has to move to the app's new
/// target framework with it, or the solution fails to restore (NU1201). The projects are evaluated with
/// MSBuild, so these tests need the .NET SDK, as the upgrade does.
/// </summary>
public sealed class DependentProjectsMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public DependentProjectsMigrationTests()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """
        );
    }

    public void Dispose() => _app.Dispose();

    private string WriteFile(string relativePath, string content)
    {
        var path = Path.Combine(_app.Root, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path) ?? _app.Root);
        File.WriteAllText(path, content);
        return path;
    }

    private static Task<string> ReadFile(string path) =>
        File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);

    private static string TestProject(string properties, string reference = @"..\App\App.csproj") =>
        $"""
            <Project Sdk="Microsoft.NET.Sdk">

              <PropertyGroup>
                {properties}
                <IsTestProject>true</IsTestProject>
              </PropertyGroup>

              <ItemGroup>
                <ProjectReference Include="{reference}" />
              </ItemGroup>

            </Project>
            """;

    private async Task<(int ExitCode, IReadOnlyList<UpgradeMessage> Messages)> Migrate()
    {
        var report = new UpgradeReport();
        using var output = UpgradeConsole.Use(report, TextWriter.Null);
        UpgradeConsole.BeginStep("Dependent projects");

        var exitCode = await DependentProjectsMigration.Migrate(
            _app.Root,
            Path.Combine(_app.Root, "App", "App.csproj")
        );

        return (exitCode, report.Steps.Single().Messages);
    }

    [Fact]
    public async Task Migrate_MovesTestProjectToTheAppsTargetFramework()
    {
        var tests = WriteFile(
            Path.Combine("Tests", "Tests.csproj"),
            TestProject("<TargetFramework>net8.0</TargetFramework>")
        );

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(TestProject("<TargetFramework>net10.0</TargetFramework>"), await ReadFile(tests));
        var message = Assert.Single(messages);
        Assert.Equal(UpgradeMessageStatus.Ok, message.Status);
        Assert.Equal($"{Path.Combine("Tests", "Tests.csproj")} moved from net8.0 to net10.0", message.Text);
    }

    [Fact]
    public async Task Migrate_MatchesReferencesWrittenWithForwardSlashes()
    {
        var tests = WriteFile(
            Path.Combine("test", "App.Tests", "App.Tests.csproj"),
            TestProject("<TargetFramework>net8.0</TargetFramework>", "../../App/App.csproj")
        );

        var (exitCode, _) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Contains("<TargetFramework>net10.0</TargetFramework>", await ReadFile(tests), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Migrate_KeepsTheProjectFilesByteOrderMark()
    {
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), "");
        await File.WriteAllTextAsync(
            tests,
            TestProject("<TargetFramework>net8.0</TargetFramework>"),
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: true),
            TestContext.Current.CancellationToken
        );

        await Migrate();

        var bytes = await File.ReadAllBytesAsync(tests, TestContext.Current.CancellationToken);
        Assert.True(bytes.AsSpan().StartsWith(Encoding.UTF8.Preamble));
        Assert.Equal(
            TestProject("<TargetFramework>net10.0</TargetFramework>"),
            Encoding.UTF8.GetString(bytes[Encoding.UTF8.Preamble.Length..])
        );
    }

    [Fact]
    public async Task Migrate_ChangesTheFrameworkWhereAVariableDefinesIt()
    {
        var tests = WriteFile(
            Path.Combine("Tests", "Tests.csproj"),
            TestProject(
                "<TestFramework>net8.0</TestFramework>\n    <TargetFramework>$(TestFramework)</TargetFramework>"
            )
        );

        var (exitCode, _) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(
            TestProject(
                "<TestFramework>net10.0</TestFramework>\n    <TargetFramework>$(TestFramework)</TargetFramework>"
            ),
            await ReadFile(tests)
        );
    }

    [Fact]
    public async Task Migrate_ChangesTheFrameworkInTheDirectoryBuildPropsThatSetsIt()
    {
        var props = WriteFile(
            Path.Combine("Tests", "Directory.Build.props"),
            """
            <Project>
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """
        );
        var project = TestProject("");
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), project);

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(project, await ReadFile(tests));
        Assert.Contains("<TargetFramework>net10.0</TargetFramework>", await ReadFile(props), StringComparison.Ordinal);
        Assert.EndsWith(
            $"(set in {Path.Combine("Tests", "Directory.Build.props")})",
            Assert.Single(messages).Text,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task Migrate_LeavesProjectsThatDoNotReferenceTheAppAlone()
    {
        var tool = """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """;
        var path = WriteFile(Path.Combine("Tools", "Tools.csproj"), tool);

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(tool, await ReadFile(path));
        Assert.Equal(UpgradeMessageStatus.Skip, Assert.Single(messages).Status);
    }

    [Theory]
    [InlineData("bin")]
    [InlineData(".hidden")]
    public async Task Migrate_IgnoresBuildOutputAndHiddenFolders(string folder)
    {
        var copy = TestProject("<TargetFramework>net8.0</TargetFramework>", @"..\..\App\App.csproj");
        var path = WriteFile(Path.Combine(folder, "Tests", "Tests.csproj"), copy);

        var (_, messages) = await Migrate();

        Assert.Equal(copy, await ReadFile(path));
        Assert.Equal("No other projects reference the app project", Assert.Single(messages).Text);
    }

    [Fact]
    public async Task Migrate_FindsProjectsUpToTheMaximumDepth()
    {
        var folders = Enumerable.Range(1, DependentProjectsMigration.MaxProjectDepth).Select(i => $"d{i}").ToArray();
        var reference = string.Concat(Enumerable.Repeat(@"..\", folders.Length)) + @"App\App.csproj";
        var deepest = WriteFile(
            Path.Combine([.. folders, "Tests.csproj"]),
            TestProject("<TargetFramework>net8.0</TargetFramework>", reference)
        );
        var tooDeep = TestProject("<TargetFramework>net8.0</TargetFramework>", @"..\" + reference);
        var tooDeepPath = WriteFile(Path.Combine([.. folders, "d", "Tests.csproj"]), tooDeep);

        await Migrate();

        Assert.Contains("net10.0", await ReadFile(deepest), StringComparison.Ordinal);
        Assert.Equal(tooDeep, await ReadFile(tooDeepPath));
    }

    [Fact]
    public async Task Migrate_OnAProjectAlreadyOnTheTargetFramework_ChangesNothing()
    {
        var content = TestProject("<TargetFramework>net10.0</TargetFramework>");
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), content);

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(content, await ReadFile(tests));
        Assert.Equal(UpgradeMessageStatus.Skip, Assert.Single(messages).Status);
    }

    [Theory]
    [InlineData("<TargetFrameworks>net8.0;net9.0</TargetFrameworks>")]
    [InlineData("<TargetFramework>netstandard2.1</TargetFramework>")]
    [InlineData("<Major>8</Major>\n    <TargetFramework>net$(Major).0</TargetFramework>")]
    public async Task Migrate_OnAFrameworkItCannotChangeSafely_AsksForManualFollowUp(string properties)
    {
        var content = TestProject(properties);
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), content);

        var (exitCode, messages) = await Migrate();

        Assert.Equal(3, exitCode);
        Assert.Equal(content, await ReadFile(tests));
        Assert.Equal(UpgradeMessageStatus.Todo, Assert.Single(messages).Status);
    }

    [Fact]
    public async Task Migrate_OnAProjectFileItCannotRead_AsksForManualFollowUp()
    {
        WriteFile(Path.Combine("Tests", "Tests.csproj"), "<Project");

        var (exitCode, messages) = await Migrate();

        Assert.Equal(3, exitCode);
        Assert.Equal(UpgradeMessageStatus.Todo, Assert.Single(messages).Status);
    }
}
