using System.Text;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// A service owner's test project references the app project, so it has to move to the app's new
/// target framework with it, or the solution fails to restore (NU1201).
/// </summary>
public sealed class DependentProjectsMigrationTests : IDisposable
{
    private const string AppProject = """
        <Project Sdk="Microsoft.NET.Sdk.Web">
          <PropertyGroup>
            <TargetFramework>net10.0</TargetFramework>
          </PropertyGroup>
        </Project>
        """;

    private readonly TempAppFolder _app = new();

    public DependentProjectsMigrationTests()
    {
        _app.Write("App.csproj", AppProject);
    }

    public void Dispose() => _app.Dispose();

    private string WriteProject(string relativePath, string content)
    {
        var path = Path.Combine(_app.Root, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path) ?? _app.Root);
        File.WriteAllText(path, content);
        return path;
    }

    private static string TestProject(string targetFrameworkElement, string reference = @"..\App\App.csproj") =>
        $"""
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                {targetFrameworkElement}
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
            Path.Combine(_app.Root, "App", "App.csproj"),
            "net10.0"
        );

        return (exitCode, report.Steps.Single().Messages);
    }

    [Fact]
    public async Task Migrate_MovesTestProjectToTheAppsTargetFramework()
    {
        var tests = WriteProject(
            Path.Combine("Tests", "Tests.csproj"),
            TestProject("<TargetFramework>net8.0</TargetFramework>")
        );

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(
            TestProject("<TargetFramework>net10.0</TargetFramework>"),
            await File.ReadAllTextAsync(tests, TestContext.Current.CancellationToken)
        );
        var message = Assert.Single(messages);
        Assert.Equal(UpgradeMessageStatus.Ok, message.Status);
        Assert.Equal($"{Path.Combine("Tests", "Tests.csproj")} moved from net8.0 to net10.0", message.Text);
    }

    [Fact]
    public async Task Migrate_MatchesReferencesWrittenWithForwardSlashes()
    {
        var tests = WriteProject(
            Path.Combine("test", "App.Tests", "App.Tests.csproj"),
            TestProject("<TargetFramework>net8.0</TargetFramework>", "../../App/App.csproj")
        );

        var (exitCode, _) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Contains(
            "<TargetFramework>net10.0</TargetFramework>",
            await File.ReadAllTextAsync(tests, TestContext.Current.CancellationToken),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task Migrate_KeepsTheProjectFilesByteOrderMark()
    {
        var tests = WriteProject(Path.Combine("Tests", "Tests.csproj"), "");
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
    public async Task Migrate_LeavesProjectsThatDoNotReferenceTheAppAlone()
    {
        var tool = """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """;
        var path = WriteProject(Path.Combine("Tools", "Tools.csproj"), tool);

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(tool, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
        Assert.Equal(UpgradeMessageStatus.Skip, Assert.Single(messages).Status);
    }

    [Fact]
    public async Task Migrate_IgnoresBuildOutput()
    {
        var copy = TestProject("<TargetFramework>net8.0</TargetFramework>", @"..\..\..\App\App.csproj");
        var path = WriteProject(Path.Combine("Tests", "bin", "Debug", "Tests.csproj"), copy);

        var (_, messages) = await Migrate();

        Assert.Equal(copy, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
        Assert.Equal("No other projects reference the app project", Assert.Single(messages).Text);
    }

    [Fact]
    public async Task Migrate_OnAProjectAlreadyOnTheTargetFramework_ChangesNothing()
    {
        var content = TestProject("<TargetFramework>net10.0</TargetFramework>");
        var tests = WriteProject(Path.Combine("Tests", "Tests.csproj"), content);

        var (exitCode, messages) = await Migrate();

        Assert.Equal(0, exitCode);
        Assert.Equal(content, await File.ReadAllTextAsync(tests, TestContext.Current.CancellationToken));
        Assert.Equal(UpgradeMessageStatus.Skip, Assert.Single(messages).Status);
    }

    [Theory]
    [InlineData("<TargetFrameworks>net8.0;net9.0</TargetFrameworks>")]
    [InlineData("")]
    [InlineData("<TargetFramework>netstandard2.1</TargetFramework>")]
    public async Task Migrate_OnAFrameworkSettingItCannotRewrite_AsksForManualFollowUp(string targetFrameworkElement)
    {
        var content = TestProject(targetFrameworkElement);
        var tests = WriteProject(Path.Combine("Tests", "Tests.csproj"), content);

        var (exitCode, messages) = await Migrate();

        Assert.Equal(3, exitCode);
        Assert.Equal(content, await File.ReadAllTextAsync(tests, TestContext.Current.CancellationToken));
        Assert.Equal(UpgradeMessageStatus.Todo, Assert.Single(messages).Status);
    }
}
