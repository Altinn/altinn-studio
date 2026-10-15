using System.IO.Compression;
using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.StudioctlServer.Studioctl;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>Exercises the default service and full upgrade pipeline with an offline NuGet source.</summary>
public sealed class V8Tov9UpgradeTargetFrameworkTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private void WriteSourceApp(string framework)
    {
        var library = Path.Combine(_app.Root, "Library");
        Directory.CreateDirectory(library);
        File.WriteAllText(
            Path.Combine(library, "Altinn.App.Api.csproj"),
            "<Project Sdk=\"Microsoft.NET.Sdk\"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>"
        );
        File.WriteAllText(
            Path.Combine(library, "Features.cs"),
            "namespace Altinn.App.Core.Features { public sealed class Feature { } }"
        );
        _app.Write(
            "App.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup><TargetFramework>{framework}</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup>
              <ItemGroup><ProjectReference Include="../Library/Altinn.App.Api.csproj" /></ItemGroup>
              <ItemGroup><Using Include="Altinn.App.Core.Features" /></ItemGroup>
            </Project>
            """
        );
        _app.Write("Program.cs", "internal static class Program { public static void Main() { } }");
        WriteOfflineSource();
        WriteDockerfile("10.0-alpine");
    }

    private void WritePackageApp(string framework, string version = "9.0.0-preview.7")
    {
        _app.Write(
            "App.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup><TargetFramework>{framework}</TargetFramework></PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{version}" />
                <PackageReference Include="Altinn.App.Core" Version="{version}" />
              </ItemGroup>
            </Project>
            """
        );
        WriteOfflineSource();
        WritePackageVersion(version);
        WriteDockerfile(framework[3..] + "-alpine");
    }

    private void WriteSourceProjects()
    {
        foreach (var package in new[] { "Altinn.App.Api", "Altinn.App.Core" })
            _app.Write(
                $"../src/App/backend/src/{package}/{package}.csproj",
                "<Project Sdk=\"Microsoft.NET.Sdk\"><PropertyGroup><TargetFramework>net11.0</TargetFramework></PropertyGroup></Project>"
            );
    }

    private void WritePackageVersion(string version)
    {
        foreach (var package in new[] { "Altinn.App.Api", "Altinn.App.Core" })
            WritePackage(package, version);
    }

    private void WritePackage(string package, string version, string? apiDependency = null)
    {
        using var archive = ZipFile.Open(
            Path.Combine(_app.Root, "packages", package + "." + version + ".nupkg"),
            ZipArchiveMode.Create
        );
        using var writer = new StreamWriter(archive.CreateEntry(package + ".nuspec").Open());
        var dependency = apiDependency is null
            ? ""
            : $"<dependencies><dependency id=\"Altinn.App.Api\" version=\"{apiDependency}\" /></dependencies>";
        writer.Write(
            $"<package><metadata><id>{package}</id><version>{version}</version><authors>tests</authors><description>Offline fixture</description>{dependency}</metadata></package>"
        );
    }

    private void WriteOfflineSource()
    {
        var source = Path.Combine(_app.Root, "packages");
        Directory.CreateDirectory(source);
        new XDocument(
            new XElement(
                "configuration",
                new XElement(
                    "packageSources",
                    new XElement("clear"),
                    new XElement("add", new XAttribute("key", "fixture"), new XAttribute("value", source))
                ),
                new XElement(
                    "config",
                    new XElement(
                        "add",
                        new XAttribute("key", "globalPackagesFolder"),
                        new XAttribute("value", Path.Combine(_app.Root, "global-packages"))
                    )
                )
            )
        ).Save(Path.Combine(_app.Root, "NuGet.Config"));
    }

    private void WriteDockerfile(string tag) =>
        File.WriteAllText(
            Path.Combine(_app.Root, "Dockerfile"),
            $"FROM mcr.microsoft.com/dotnet/sdk:{tag} AS build\nFROM mcr.microsoft.com/dotnet/aspnet:{tag}\n"
        );

    private async Task<AppUpgradeResult> RunDefault(bool convertPackageReferences = false, string? studioRoot = null)
    {
        using var service = new AppUpgradeService();
        return await service.RunAsync(
            new AppUpgradeRequest(
                UpgradeKinds.V9,
                _app.Root,
                StudioRoot: studioRoot,
                ConvertPackageReferences: convertPackageReferences,
                AllowDirty: true
            ),
            TestContext.Current.CancellationToken
        );
    }

    private void WriteDependentProject() =>
        _app.Write(
            "../Tests/Tests.csproj",
            "<Project Sdk=\"Microsoft.NET.Sdk\"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup><ItemGroup><ProjectReference Include=\"../App/App.csproj\" /></ItemGroup></Project>"
        );

    private Dictionary<string, string> Snapshot(params string[] files) =>
        files.ToDictionary(file => file, file => File.ReadAllText(Path.Combine(_app.Root, file)));

    private void AssertUnchanged(Dictionary<string, string> snapshot) =>
        Assert.All(snapshot, file => Assert.Equal(file.Value, File.ReadAllText(Path.Combine(_app.Root, file.Key))));

    private string FrameworkAndReferences() =>
        string.Join(
            "\n",
            XDocument
                .Load(Path.Combine(_app.Root, "App", "App.csproj"))
                .Descendants()
                .Where(element =>
                    element.Name.LocalName
                        is "TargetFramework"
                            or "TargetFrameworks"
                            or "PackageReference"
                            or "ProjectReference"
                )
                .Select(element => element.ToString(SaveOptions.DisableFormatting))
        );

    private string? Framework() =>
        XDocument
            .Load(Path.Combine(_app.Root, "App", "App.csproj"))
            .Descendants("TargetFramework")
            .SingleOrDefault()
            ?.Value;

    private static string Report(AppUpgradeResult result) =>
        string.Join("\n", result.Steps.SelectMany(step => step.Messages.Select(message => message.Text)))
        + result.Error;

    [Fact]
    public async Task DefaultUpgrade_InheritedSourceReferencesMoveToNet11()
    {
        WriteSourceApp("net10.0");
        var projectPath = Path.Combine(_app.Root, "App", "App.csproj");
        var project = XDocument.Load(projectPath);
        project.Descendants("ProjectReference").Single().Remove();
        project.Save(projectPath);
        _app.Write(
            "Directory.Build.props",
            """
            <Project><ItemGroup><ProjectReference Include="$(MSBuildThisFileDirectory)../Library/Altinn.App.Api.csproj" /></ItemGroup></Project>
            """
        );
        var props = Snapshot("App/Directory.Build.props");
        WriteDependentProject();

        var result = await RunDefault();

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("net11.0", Framework());
        Assert.Contains(
            "sdk:11.0-alpine",
            await File.ReadAllTextAsync(Path.Combine(_app.Root, "Dockerfile"), TestContext.Current.CancellationToken),
            StringComparison.Ordinal
        );
        Assert.Contains(
            "aspnet:11.0-alpine",
            await File.ReadAllTextAsync(Path.Combine(_app.Root, "Dockerfile"), TestContext.Current.CancellationToken),
            StringComparison.Ordinal
        );
        Assert.DoesNotContain("PackageReference", _app.Read("App.csproj"), StringComparison.Ordinal);
        Assert.Equal(
            "net11.0",
            XDocument
                .Load(Path.Combine(_app.Root, "Tests", "Tests.csproj"))
                .Descendants("TargetFramework")
                .Single()
                .Value
        );
        AssertUnchanged(props);
    }

    [Theory]
    [InlineData("net8.0", "8.11.3")]
    [InlineData("net10.0", "9.0.0-preview.7")]
    public async Task DefaultUpgrade_FreshAndResumedAppsGetCompatiblePackagesAndNet11(
        string framework,
        string apiVersion
    )
    {
        WritePackageApp(framework, apiVersion);
        WritePackageVersion("9.0.0-preview.8");

        var result = await RunDefault();

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("net11.0", Framework());
        Assert.All(
            XDocument.Load(Path.Combine(_app.Root, "App", "App.csproj")).Descendants("PackageReference"),
            reference => Assert.Equal("9.0.0-preview.8", reference.Attribute("Version")?.Value)
        );
        Assert.Contains(
            "sdk:11.0-alpine",
            await File.ReadAllTextAsync(Path.Combine(_app.Root, "Dockerfile"), TestContext.Current.CancellationToken),
            StringComparison.Ordinal
        );
        if (apiVersion.StartsWith("9.", StringComparison.Ordinal))
            Assert.DoesNotContain(result.Steps, step => step.Name == "Semantic analysis");
        else
            Assert.Contains(result.Steps, step => step.Name == "Semantic analysis");
    }

    [Theory]
    [InlineData("net8.0", "8.11.3")]
    [InlineData("net10.0", "9.0.0-preview.7")]
    [InlineData("net11.0", "9.0.0-preview.7")]
    public async Task DefaultUpgrade_UnavailableCompatiblePackagesPreserveFrameworkAndVersions(
        string framework,
        string apiVersion
    )
    {
        WritePackageApp(framework, apiVersion);
        var dockerfile = await File.ReadAllTextAsync(
            Path.Combine(_app.Root, "Dockerfile"),
            TestContext.Current.CancellationToken
        );

        var result = await RunDefault();

        Assert.Equal(1, result.ExitCode);
        Assert.Equal(framework, Framework());
        Assert.Equal(
            dockerfile,
            await File.ReadAllTextAsync(Path.Combine(_app.Root, "Dockerfile"), TestContext.Current.CancellationToken)
        );
        Assert.All(
            XDocument.Load(Path.Combine(_app.Root, "App", "App.csproj")).Descendants("PackageReference"),
            reference => Assert.Equal(apiVersion, reference.Attribute("Version")?.Value)
        );
        Assert.Contains("at least 9.0.0-preview.8", Report(result), StringComparison.Ordinal);
    }

    [Fact]
    public async Task DefaultUpgrade_PreservesANewerExactPinAndUsesItsSchemaVersionOnRerun()
    {
        const string version = "[9.0.0-preview.9]";
        const string schemaVersion = "9.0.0-preview.9";
        WritePackageApp("net10.0", schemaVersion);
        var projectPath = Path.Combine(_app.Root, "App", "App.csproj");
        var project = XDocument.Load(projectPath);
        foreach (var reference in project.Descendants("PackageReference"))
            reference.SetAttributeValue("Version", version);
        project.Save(projectPath);
        _app.Write("schema.json", "{\"$schema\":\"https://altinncdn.no/schemas/json/layout/layout.schema.v1.json\"}");

        var result = await RunDefault();
        var second = await RunDefault();

        Assert.Equal(0, result.ExitCode);
        Assert.Equal(0, second.ExitCode);
        Assert.Equal("net11.0", Framework());
        Assert.All(
            XDocument.Load(projectPath).Descendants("PackageReference"),
            reference => Assert.Equal(version, reference.Attribute("Version")?.Value)
        );
        Assert.Contains(
            SchemaRefMigration.AppDistUrl(schemaVersion) + "/schemas/json/layout/layout.schema.v1.json",
            _app.Read("schema.json"),
            StringComparison.Ordinal
        );
    }

    [Theory]
    [InlineData(false, 0)]
    [InlineData(true, 3)]
    public async Task DefaultUpgrade_UsesTheApiPinAfterRepairingDependencyFloors(
        bool manualDockerfile,
        int expectedExitCode
    )
    {
        WritePackageApp("net10.0", "9.0.0-preview.8");
        WritePackageVersion("9.0.0-preview.9");
        WritePackage("Fixture.Extension", "1.0.0", apiDependency: "9.0.0-preview.9");
        var projectPath = Path.Combine(_app.Root, "App", "App.csproj");
        var project = XDocument.Load(projectPath);
        Assert
            .IsType<XElement>(project.Root)
            .Add(
                new XElement(
                    "ItemGroup",
                    new XElement(
                        "PackageReference",
                        new XAttribute("Include", "Fixture.Extension"),
                        new XAttribute("Version", "1.0.0")
                    )
                )
            );
        project.Save(projectPath);
        _app.Write("schema.json", "{\"$schema\":\"https://altinncdn.no/schemas/json/layout/layout.schema.v1.json\"}");
        if (manualDockerfile)
            await File.WriteAllTextAsync(
                Path.Combine(_app.Root, "Dockerfile"),
                "FROM custom/dotnet:10.0\n",
                TestContext.Current.CancellationToken
            );

        var result = await RunDefault();

        Assert.Equal(expectedExitCode, result.ExitCode);
        if (manualDockerfile)
            Assert.Contains("No .NET base image found", Report(result), StringComparison.Ordinal);
        Assert.Equal(
            "9.0.0-preview.9",
            XDocument
                .Load(projectPath)
                .Descendants("PackageReference")
                .Single(reference => reference.Attribute("Include")?.Value == "Altinn.App.Api")
                .Attribute("Version")
                ?.Value
        );
        Assert.Contains(
            SchemaRefMigration.AppDistUrl("9.0.0-preview.9") + "/schemas/json/layout/layout.schema.v1.json",
            _app.Read("schema.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task DefaultUpgrade_AmbiguousVersionRefusalPreservesProjectAndCompanionFiles()
    {
        WritePackageApp("net10.0", "9.0.0-preview.9");
        var projectPath = Path.Combine(_app.Root, "App", "App.csproj");
        var project = XDocument.Load(projectPath);
        project
            .Descendants("PackageReference")
            .Single(reference => reference.Attribute("Include")?.Value == "Altinn.App.Api")
            .SetAttributeValue("Version", "9.*");
        project.Save(projectPath);
        WriteDependentProject();
        _app.Write("schema.json", "{\"$schema\":\"https://altinncdn.no/schemas/json/layout/layout.schema.v1.json\"}");
        var declarations = FrameworkAndReferences();
        var companions = Snapshot("Dockerfile", "Tests/Tests.csproj", "App/schema.json");

        var result = await RunDefault();

        Assert.Equal(3, result.ExitCode);
        Assert.Equal(declarations, FrameworkAndReferences());
        AssertUnchanged(companions);
        Assert.Contains("floating or ranged Altinn.App v9 versions", Report(result), StringComparison.Ordinal);
    }

    [Fact]
    public async Task DefaultUpgrade_ConditionalFrameworkRefusalPreservesProjectAndCompanionFiles()
    {
        WritePackageApp("net10.0", "9.0.0-preview.8");
        var projectPath = Path.Combine(_app.Root, "App", "App.csproj");
        var project = XDocument.Load(projectPath);
        Assert
            .IsType<XElement>(project.Descendants("TargetFramework").Single().Parent)
            .SetAttributeValue("Condition", "'$(Configuration)' == 'Debug'");
        project.Save(projectPath);
        WriteDependentProject();
        _app.Write("schema.json", "{\"$schema\":\"https://altinncdn.no/schemas/json/layout/layout.schema.v1.json\"}");
        var declarations = FrameworkAndReferences();
        var companions = Snapshot("Dockerfile", "Tests/Tests.csproj", "App/schema.json");

        var result = await RunDefault();

        Assert.Equal(3, result.ExitCode);
        Assert.Equal(declarations, FrameworkAndReferences());
        AssertUnchanged(companions);
        Assert.Contains("manually before updating", Report(result), StringComparison.Ordinal);
    }

    [Fact]
    public async Task DefaultUpgrade_SourceRootOutsideTheAppPreservesProjectAndCompanionFiles()
    {
        WritePackageApp("net10.0");
        using var other = new TempAppFolder();
        Directory.CreateDirectory(Path.Combine(other.Root, "src", "App"));
        WriteDependentProject();
        var declarations = FrameworkAndReferences();
        var companions = Snapshot("Dockerfile", "Tests/Tests.csproj");

        var result = await RunDefault(convertPackageReferences: true, studioRoot: other.Root);

        Assert.Equal(1, result.ExitCode);
        Assert.Equal(declarations, FrameworkAndReferences());
        AssertUnchanged(companions);
    }

    [Fact]
    public async Task DefaultUpgrade_SourceConversionMovesFrameworkAndReferencesTogether()
    {
        WritePackageApp("net10.0");
        WriteSourceProjects();

        var result = await RunDefault(convertPackageReferences: true, studioRoot: _app.Root);

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("net11.0", Framework());
        var project = XDocument.Load(Path.Combine(_app.Root, "App", "App.csproj"));
        Assert.Empty(project.Descendants("PackageReference"));
        Assert.Equal(2, project.Descendants("ProjectReference").Count());
        Assert.Contains(
            "sdk:11.0-alpine",
            await File.ReadAllTextAsync(Path.Combine(_app.Root, "Dockerfile"), TestContext.Current.CancellationToken),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task DefaultUpgrade_InheritedPackageConversionRefusalPreservesProjectAndCompanionFiles()
    {
        WritePackageApp("net10.0");
        WriteSourceProjects();
        _app.Write(
            "Directory.Build.props",
            """
            <Project><ItemGroup><PackageReference Include="Altinn.App.Core" Version="9.0.0-preview.7" /></ItemGroup></Project>
            """
        );
        WriteDependentProject();
        _app.Write("schema.json", "{\"$schema\":\"https://altinncdn.no/schemas/json/layout/layout.schema.v1.json\"}");
        var declarations = FrameworkAndReferences();
        var companions = Snapshot("Dockerfile", "Tests/Tests.csproj", "App/schema.json", "App/Directory.Build.props");

        var result = await RunDefault(convertPackageReferences: true, studioRoot: _app.Root);

        Assert.Equal(1, result.ExitCode);
        Assert.Equal(declarations, FrameworkAndReferences());
        AssertUnchanged(companions);
        Assert.Contains("Altinn.App package references remain", Report(result), StringComparison.Ordinal);
        Assert.DoesNotContain("Target framework moved", Report(result), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Upgrade_SkipCsprojUpgradeLeavesFrameworkAndDockerfileAsTheyWere()
    {
        WriteSourceApp("net10.0");
        var dockerfile = await File.ReadAllTextAsync(
            Path.Combine(_app.Root, "Dockerfile"),
            TestContext.Current.CancellationToken
        );

        var exitCode = await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                _app.Root,
                "App/App.csproj",
                9,
                "net11.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                new UpgradeReport(),
                new StringWriter(),
                TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        Assert.Equal(0, exitCode);
        Assert.Equal("net10.0", Framework());
        Assert.Equal(
            dockerfile,
            await File.ReadAllTextAsync(Path.Combine(_app.Root, "Dockerfile"), TestContext.Current.CancellationToken)
        );
    }
}
