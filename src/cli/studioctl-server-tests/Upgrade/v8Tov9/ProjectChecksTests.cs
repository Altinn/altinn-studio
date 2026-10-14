using Altinn.Studio.Cli.Upgrade.v8Tov9.ProjectChecks;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ProjectChecksTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

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

    private string CreateTempFile(string xml) => _app.Write("App.csproj", xml);

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

    [Fact]
    public void SupportedSourceVersion_Accepts_WhenProjectReferencesComeFromDirectoryBuildProps()
    {
        using var app = new TempAppFolder();
        File.WriteAllText(
            Path.Combine(app.Root, "Directory.Build.props"),
            """
            <Project>
              <ItemGroup>
                <ProjectReference Include="$(MSBuildThisFileDirectory)../src/Altinn.App.Api/Altinn.App.Api.csproj" />
              </ItemGroup>
            </Project>
            """
        );
        var path = app.Write("App.csproj", """<Project Sdk="Microsoft.NET.Sdk.Web" />""");

        Assert.True(new ProjectChecks(path).SupportedSourceVersion());
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

    [Theory]
    [InlineData("9.0.0-preview.8", "9.0.0-preview.8")]
    [InlineData("9.0.0-preview.9", "9.0.0-preview.9")]
    [InlineData("9.0-preview.8", "9.0.0-preview.8")]
    [InlineData("9.0.0.0-preview.8", "9.0.0-preview.8")]
    [InlineData("[9.0.0-preview.8]", "9.0.0-preview.8")]
    [InlineData("[9.0.0-preview.9]", "9.0.0-preview.9")]
    [InlineData("[9.0-preview.8]", "9.0.0-preview.8")]
    [InlineData("[9.0.0.0-preview.8]", "9.0.0-preview.8")]
    public void AppPackageVersion_NormalizesCompatibleExactPins(string declaredVersion, string schemaVersion)
    {
        var checks = new ProjectChecks(CreateTempProject(declaredVersion, coreVersion: declaredVersion));

        Assert.Equal(schemaVersion, checks.AppPackageVersion());
        Assert.True(checks.HasPackageVersionsAtLeast("9.0.0-preview.8"));
        Assert.False(checks.HasAmbiguousPackageVersions());
    }

    [Theory]
    [InlineData("9.*")]
    [InlineData("[9.0.0-preview.7,9.0.0-preview.10)")]
    public void TargetVersion_RangesCannotSupplyACompatiblePinOrSchemaVersion(string version)
    {
        var checks = new ProjectChecks(CreateTempProject(version));

        Assert.True(checks.IsTargetVersion());
        Assert.True(checks.HasAmbiguousPackageVersions());
        Assert.False(checks.HasPackageVersionsAtLeast("9.0.0-preview.8"));
        Assert.Null(checks.AppPackageVersion());
    }

    [Theory]
    [InlineData("9.0.0-preview.7", "9.0.0-preview.9")]
    [InlineData("[9.0.0-preview.9]", "9.0.0-preview.7")]
    public void HasPackageVersionsAtLeast_RequiresEveryExplicitPinToMeetTheFloor(string apiVersion, string coreVersion)
    {
        var checks = new ProjectChecks(CreateTempProject(apiVersion, coreVersion));

        Assert.False(checks.HasPackageVersionsAtLeast("9.0.0-preview.8"));
    }

    [Fact]
    public void HasPackageVersionsAtLeast_AcceptsCompatibleApiWithoutExplicitCore()
    {
        var checks = new ProjectChecks(CreateTempProject("9.0.0-preview.8"));

        Assert.True(checks.HasPackageVersionsAtLeast("9.0.0-preview.8"));
        Assert.Equal("9.0.0-preview.8", checks.AppPackageVersion());
    }

    [Fact]
    public void AppPackageVersion_RequiresConditionalApiDeclarationsToAgree()
    {
        var path = CreateTempFile(
            """
            <Project><ItemGroup>
              <PackageReference Include="Altinn.App.Api" Version="9.0.0-preview.8" Condition="'$(Configuration)' == 'Debug'" />
              <PackageReference Include="Altinn.App.Api" Version="9.0.0-preview.9" Condition="'$(Configuration)' == 'Release'" />
            </ItemGroup></Project>
            """
        );

        Assert.Null(new ProjectChecks(path).AppPackageVersion());
    }

    [Theory]
    [InlineData("9.0.0-preview.7", true)]
    [InlineData("$(AltinnCoreVersion)", true)]
    [InlineData("9.*", true)]
    [InlineData("[9.0.0-preview.8,10.0.0)", true)]
    [InlineData("10.0.0", true)]
    [InlineData("9.0.0-preview.8", false)]
    [InlineData("[9.0.0-preview.9]", false)]
    public void HasUnsupportedInheritedPackageVersions_RequiresCompatibleExactV9Pins(string version, bool unsupported)
    {
        var path = CreateTempProject("9.0.0-preview.8");
        _app.Write(
            "../Directory.Build.props",
            $"""<Project><ItemGroup><PackageReference Include="Altinn.App.Core" Version="{version}" /></ItemGroup></Project>"""
        );
        var checks = new ProjectChecks(path);

        Assert.Equal(unsupported, checks.HasUnsupportedInheritedPackageVersions("9.0.0-preview.8"));
        Assert.True(checks.HasInheritedAltinnPackageReferences());
    }

    [Theory]
    [InlineData(
        "<ProjectReference Include=\"../Library/Altinn.App.Api.csproj\" Condition=\"'$(UseLocalAltinn)' == 'true'\" />",
        false,
        true
    )]
    [InlineData(
        "<ProjectReference Include=\"../Library/Altinn.App.Api.csproj\" Condition=\"'$(UseLocalAltinn)' == 'true'\" />",
        true,
        true
    )]
    [InlineData("<ProjectReference Include=\"../Library/Altinn.App.Core.csproj\" />", false, false)]
    [InlineData("<ProjectReference Include=\"../Library/Altinn.App.Core.csproj\" />", true, false)]
    public void HasMixedAltinnReferences_DetectsLocalAndInheritedSourceDeclarations(
        string sourceReference,
        bool inherited,
        bool conditional
    )
    {
        var packages = """<PackageReference Include="Altinn.App.Api" Version="9.0.0-preview.8" />""";
        var project = CreateTempFile(
            $"<Project><ItemGroup>{packages}{(inherited ? "" : sourceReference)}</ItemGroup></Project>"
        );
        if (inherited)
            _app.Write("../Directory.Build.props", $"<Project><ItemGroup>{sourceReference}</ItemGroup></Project>");
        var checks = new ProjectChecks(project);

        Assert.True(checks.HasMixedAltinnReferences());
        Assert.Equal(conditional, checks.HasConditionalAltinnProjectReferences());
    }

    [Fact]
    public void HasConditionalAltinnProjectReferences_DetectsConditionOnTheItemGroup()
    {
        var project = CreateTempFile(
            """
            <Project><ItemGroup Condition="'$(UseLocalAltinn)' == 'true'">
              <ProjectReference Include="../Library/Altinn.App.Api.csproj" />
            </ItemGroup></Project>
            """
        );
        var checks = new ProjectChecks(project);

        Assert.True(checks.HasConditionalAltinnProjectReferences());
        Assert.False(checks.HasMixedAltinnReferences());
    }
}
