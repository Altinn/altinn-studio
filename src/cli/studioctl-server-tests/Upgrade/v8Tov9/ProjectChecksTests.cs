using Altinn.Studio.Cli.Upgrade.v8Tov9.ProjectChecks;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ProjectChecksTests : IDisposable
{
    private readonly List<string> _tempFiles = [];

    public void Dispose()
    {
        foreach (var path in _tempFiles)
        {
            File.Delete(path);
        }
    }

    private string CreateTempProject(string apiVersion, string? coreVersion = null)
    {
        var coreReference = coreVersion is null
            ? ""
            : $"""<PackageReference Include="Altinn.App.Core" Version="{coreVersion}" />""";
        var xml = $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{apiVersion}" />
                {coreReference}
              </ItemGroup>
            </Project>
            """;
        return CreateTempFile(xml);
    }

    private string CreateTempFile(string xml)
    {
        var path = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.csproj");
        File.WriteAllText(path, xml);
        _tempFiles.Add(path);
        return path;
    }

    [Theory]
    [InlineData("[8.11.3]")]
    [InlineData("[8.0,9.0)")]
    [InlineData("8.*")]
    [InlineData("8.11.3")]
    public void SupportedSourceVersion_AcceptsVariousNuGetVersionSyntaxes_WhenBothPackagesDeclared(string apiVersion)
    {
        var path = CreateTempProject(apiVersion, coreVersion: apiVersion);
        var checks = new ProjectChecks(path);

        Assert.True(checks.SupportedSourceVersion());
    }

    [Fact]
    public void SupportedSourceVersion_AcceptsApiOnly_WhenCoreIsNotExplicitlyDeclared()
    {
        var path = CreateTempProject("[8.11.3]");
        var checks = new ProjectChecks(path);

        Assert.True(checks.SupportedSourceVersion());
    }

    [Fact]
    public void SupportedSourceVersion_StillValidatesCore_WhenExplicitlyDeclaredAndOutOfRange()
    {
        var path = CreateTempProject("8.11.3", coreVersion: "7.5.0");
        var checks = new ProjectChecks(path);

        Assert.False(checks.SupportedSourceVersion());
    }

    [Fact]
    public void SupportedSourceVersion_Rejects_WhenApiIsMissing()
    {
        var xml = """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Core" Version="8.11.3" />
              </ItemGroup>
            </Project>
            """;
        var path = CreateTempFile(xml);
        var checks = new ProjectChecks(path);

        Assert.False(checks.SupportedSourceVersion());
    }

    [Theory]
    [InlineData("7.5.0")]
    [InlineData("9.0.0")]
    [InlineData("[7.0,8.0)")]
    [InlineData("[8.0,9.0]")]
    [InlineData("[8.0,10.0)")]
    [InlineData("[8.0,)")]
    public void SupportedSourceVersion_Rejects_WhenApiIsOutsideThe8xRange(string apiVersion)
    {
        var path = CreateTempProject(apiVersion);
        var checks = new ProjectChecks(path);

        Assert.False(checks.SupportedSourceVersion());
    }

    [Fact]
    public void SupportedSourceVersion_Accepts_WhenUsingProjectReferencesInsteadOfPackageReferences()
    {
        var xml = """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <ProjectReference Include="../../../src/Altinn.App.Api/Altinn.App.Api.csproj" />
                <ProjectReference Include="../../../src/Altinn.App.Core/Altinn.App.Core.csproj" />
              </ItemGroup>
            </Project>
            """;
        var path = CreateTempFile(xml);
        var checks = new ProjectChecks(path);

        Assert.True(checks.SupportedSourceVersion());
    }

    [Theory]
    [InlineData("9.0.0")]
    [InlineData("9.*")]
    [InlineData("[9.1.2]")]
    [InlineData("[9.0,10.0)")]
    public void IsTargetVersion_AcceptsV9ForSafeUpgradeReruns(string version)
    {
        var path = CreateTempProject(version, coreVersion: version);
        var checks = new ProjectChecks(path);

        Assert.True(checks.IsTargetVersion());
    }

    [Theory]
    [InlineData("8.8.0", "9.0.0")]
    [InlineData("9.0.0", "8.8.0")]
    [InlineData("10.0.0", "10.0.0")]
    public void IsTargetVersion_RejectsMixedOrDifferentMajorVersions(string apiVersion, string coreVersion)
    {
        var path = CreateTempProject(apiVersion, coreVersion);
        var checks = new ProjectChecks(path);

        Assert.False(checks.IsTargetVersion());
    }
}
