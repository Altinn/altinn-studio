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
    public async Task Migrate_OnAnAppWithOnlyTheAppProject_SkipsTheStepAndChangesNothing()
    {
        var appProject = _app.Read("App.csproj");

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(appProject, _app.Read("App.csproj"));
        var message = Assert.Single(messages);
        Assert.Equal(UpgradeMessageStatus.Skip, message.Status);
        Assert.Equal("No other projects reference the app project", message.Text);
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

    [Fact]
    public async Task Migrate_KeepsWindowsLineEndings()
    {
        var content = TestProject("<TargetFramework>net8.0</TargetFramework>").ReplaceLineEndings("\r\n");
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), content);

        var (exitCode, _) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(content.Replace("net8.0", "net10.0", StringComparison.Ordinal), await ReadFile(tests));
    }

    [Fact]
    public async Task Migrate_EditsTheElementMSBuildReadsRatherThanACommentedOutCopy()
    {
        const string properties =
            "<!-- <TargetFramework>net8.0</TargetFramework> --> <TargetFramework>net8.0</TargetFramework>";
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), TestProject(properties));

        var (exitCode, _) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(
            TestProject(
                "<!-- <TargetFramework>net8.0</TargetFramework> --> <TargetFramework>net10.0</TargetFramework>"
            ),
            await ReadFile(tests)
        );
    }

    [Theory]
    [InlineData("<TargetFramework><![CDATA[net8.0]]></TargetFramework>")]
    [InlineData(
        "<TestFramework>net8.0</TestFramework>\n    <TargetFramework>$(TestFramework)</TargetFramework>\n    <TestFramework>net10.0</TestFramework>"
    )]
    [InlineData(
        "<TestFramework>net8.0</TestFramework>\n    <TargetFramework>$(TestFramework)</TargetFramework>\n    <TestFramework>net9.0</TestFramework>"
    )]
    public async Task Migrate_WhenTheEditWouldNotTakeEffect_AsksForManualFollowUpInsteadOfReportingAMove(
        string properties
    )
    {
        var content = TestProject(properties);
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), content);

        var (exitCode, messages) = await Migrate();

        Assert.Equal(3, exitCode);
        Assert.Equal(content, await ReadFile(tests));
        var message = Assert.Single(messages);
        Assert.Equal(UpgradeMessageStatus.Todo, message.Status);
        Assert.Contains("could not be changed automatically", message.Text, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Migrate_KeepsADeclaredLatin1Encoding()
    {
        var latin1 = Encoding.Latin1;
        var content =
            "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\n<!-- Tester for bønder -->\n"
            + TestProject("<TargetFramework>net8.0</TargetFramework>");
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), "");
        await File.WriteAllBytesAsync(tests, latin1.GetBytes(content), TestContext.Current.CancellationToken);

        var (exitCode, _) = await Migrate();

        Assert.Equal(0, exitCode);
        var bytes = await File.ReadAllBytesAsync(tests, TestContext.Current.CancellationToken);
        Assert.Equal(latin1.GetBytes(content.Replace("net8.0", "net10.0", StringComparison.Ordinal)), bytes);
    }

    [Fact]
    public async Task Migrate_KeepsUtf16Encoding()
    {
        var utf16 = new UnicodeEncoding(bigEndian: false, byteOrderMark: true);
        var content = TestProject("<TargetFramework>net8.0</TargetFramework>");
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), "");
        await File.WriteAllBytesAsync(
            tests,
            [.. utf16.GetPreamble(), .. utf16.GetBytes(content)],
            TestContext.Current.CancellationToken
        );

        var (exitCode, _) = await Migrate();

        Assert.Equal(0, exitCode);
        byte[] expected =
        [
            .. utf16.GetPreamble(),
            .. utf16.GetBytes(content.Replace("net8.0", "net10.0", StringComparison.Ordinal)),
        ];
        Assert.Equal(expected, await File.ReadAllBytesAsync(tests, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Migrate_MovesProjectsThatReachTheAppThroughAnotherProject()
    {
        var utilities = WriteFile(
            Path.Combine("TestUtils", "TestUtils.csproj"),
            TestProject("<TargetFramework>net8.0</TargetFramework>")
        );
        var tests = WriteFile(
            Path.Combine("Tests", "Tests.csproj"),
            TestProject("<TargetFramework>net8.0</TargetFramework>", @"..\TestUtils\TestUtils.csproj")
        );

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Contains("net10.0", await ReadFile(utilities), StringComparison.Ordinal);
        Assert.Contains("net10.0", await ReadFile(tests), StringComparison.Ordinal);
        Assert.Equal(2, messages.Count(message => message.Status == UpgradeMessageStatus.Ok));
    }

    [Fact]
    public async Task Migrate_EditingASharedDirectoryBuildProps_NamesTheOtherProjectsUsingIt()
    {
        var props = WriteFile(
            "Directory.Build.props",
            """
            <Project>
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """
        );
        WriteFile(Path.Combine("Tests", "Tests.csproj"), TestProject(""));
        WriteFile(Path.Combine("Tools", "Tools.csproj"), """<Project Sdk="Microsoft.NET.Sdk" />""");

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Contains("<TargetFramework>net10.0</TargetFramework>", await ReadFile(props), StringComparison.Ordinal);
        Assert.EndsWith(
            $"(set in Directory.Build.props, also used by {Path.Combine("Tools", "Tools.csproj")})",
            Assert.Single(messages).Text,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task Migrate_KeepsThePlatformSuffix()
    {
        var tests = WriteFile(
            Path.Combine("Tests", "Tests.csproj"),
            TestProject("<TargetFramework>net8.0-windows</TargetFramework>")
        );

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(TestProject("<TargetFramework>net10.0-windows</TargetFramework>"), await ReadFile(tests));
        Assert.EndsWith(
            "moved from net8.0-windows to net10.0-windows",
            Assert.Single(messages).Text,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task Migrate_OnAnAppProjectItCannotRead_AsksForManualFollowUp()
    {
        _app.Write("App.csproj", """<Project Sdk="Missing.Sdk" />""");

        var (exitCode, messages) = await Migrate();

        Assert.Equal(3, exitCode);
        Assert.Equal(UpgradeMessageStatus.Todo, Assert.Single(messages).Status);
    }

    [Fact]
    public async Task Migrate_OnAProjectFileItCannotWrite_AsksForManualFollowUp()
    {
        var content = TestProject("<TargetFramework>net8.0</TargetFramework>");
        var tests = WriteFile(Path.Combine("Tests", "Tests.csproj"), content);
        File.SetAttributes(tests, FileAttributes.ReadOnly);
        try
        {
            var (exitCode, messages) = await Migrate();

            Assert.Equal(3, exitCode);
            Assert.Equal(content, await ReadFile(tests));
            var message = Assert.Single(messages);
            Assert.Equal(UpgradeMessageStatus.Todo, message.Status);
            Assert.Contains("could not write Tests.csproj", message.Text, StringComparison.Ordinal);
        }
        finally
        {
            File.SetAttributes(tests, FileAttributes.Normal);
        }
    }

    [Fact]
    public async Task Migrate_AcceptsAnUppercaseFrameworkName()
    {
        var tests = WriteFile(
            Path.Combine("Tests", "Tests.csproj"),
            TestProject("<TargetFramework>NET8.0</TargetFramework>")
        );

        var (exitCode, _) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(TestProject("<TargetFramework>net10.0</TargetFramework>"), await ReadFile(tests));
    }
}
