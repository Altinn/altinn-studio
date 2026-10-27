using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class AppVersionTests
{
    private static AppModel Build(string csproj) =>
        Build(new Dictionary<string, string> { ["App/App.csproj"] = csproj });

    private static AppModel Build(Dictionary<string, string> files)
    {
        files["App/config/applicationmetadata.json"] = TestMeta.Json();
        return AppConfigEngine.Open(new InMemoryAppDirectory(files)).Build();
    }

    private static string Csproj(string reference) =>
        $"""<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>{reference}</ItemGroup></Project>""";

    private static string ApiReference(string version) =>
        Csproj($"""<PackageReference Include="Altinn.App.Api" Version="{version}" />""");

    private static string Properties(string properties) =>
        $"""<Project><PropertyGroup>{properties}</PropertyGroup></Project>""";

    [Theory]
    [InlineData("9.1.0", "9.1.0")]
    [InlineData("9.0.0-preview.5", "9.0.0-preview.5")]
    [InlineData("9.*", null)]
    [InlineData("[9.0.1]", "9.0.1")]
    [InlineData("[9.0.1-preview.2]", "9.0.1-preview.2")]
    [InlineData("[9.0.0, 10.0.0)", "9.0.0")]
    [InlineData("[9.2.0,)", "9.2.0")]
    [InlineData("9.1", "9.1.0")]
    [InlineData("(9.0.0, 10.0.0)", null)]
    [InlineData("9.0.*", null)]
    [InlineData("9.*-*", null)]
    [InlineData("[9.*, 10.0.0)", null)]
    [InlineData("*", null)]
    public void PackageVersion_StoresTheLowestApplicableVersionOnlyWhenNuGetFixesIt(string declared, string? expected)
    {
        var model = Build(ApiReference(declared));

        Assert.Null(model.UnsupportedAppVersion);
        Assert.Equal(expected, model.AltinnAppVersion);
    }

    [Theory]
    [InlineData("8.12.0")]
    [InlineData("[8.12.0]")]
    [InlineData("[8.0.0, 10.0.0)")]
    [InlineData("8.*")]
    [InlineData("(, 10.0.0)")]
    public void PackageVersion_ResolvingBelowV9_IsUnsupported(string declared)
    {
        var model = Build(ApiReference(declared));

        Assert.NotNull(model.UnsupportedAppVersion);
        Assert.Contains($"Altinn.App.Api {declared}", model.UnsupportedAppVersion.Reason, StringComparison.Ordinal);
        Assert.Null(model.AltinnAppVersion);
    }

    [Theory]
    [InlineData("not-a-version", "\"not-a-version\" is not a NuGet version or version range")]
    [InlineData("$(Undefined)", "property Undefined is not defined")]
    [InlineData("$([MSBuild]::ValueOrDefault('', '9.0.0'))", "cannot be evaluated")]
    public void PackageVersion_Unresolvable_ReportsWhy(string declared, string reason)
    {
        var model = Build(ApiReference(declared));

        Assert.NotNull(model.UnsupportedAppVersion);
        Assert.Contains("could not determine", model.UnsupportedAppVersion.Reason, StringComparison.Ordinal);
        Assert.Contains(reason, model.UnsupportedAppVersion.Reason, StringComparison.Ordinal);
    }

    [Fact]
    public void PropertyVersion_DefinedInDirectoryBuildPropsAboveTheProject_Resolves()
    {
        var model = Build(
            new Dictionary<string, string>
            {
                ["App/App.csproj"] = ApiReference("$(AltinnAppVersion)"),
                ["Directory.Build.props"] = Properties("<AltinnAppVersion>[9.0.1]</AltinnAppVersion>"),
            }
        );

        Assert.Null(model.UnsupportedAppVersion);
        Assert.Equal("9.0.1", model.AltinnAppVersion);
    }

    [Fact]
    public void PropertyVersion_ComposedFromOtherProperties_Resolves()
    {
        var model = Build(
            new Dictionary<string, string>
            {
                ["App/App.csproj"] = ApiReference("[$(AltinnAppVersion)]"),
                ["App/Directory.Build.props"] = Properties(
                    "<AltinnAppMajor>9</AltinnAppMajor><AltinnAppVersion>$(AltinnAppMajor).2.0</AltinnAppVersion>"
                ),
            }
        );

        Assert.Null(model.UnsupportedAppVersion);
        Assert.Equal("9.2.0", model.AltinnAppVersion);
    }

    [Fact]
    public void PropertyVersion_ProjectDefinitionOverridesDirectoryBuildProps()
    {
        var model = Build(
            new Dictionary<string, string>
            {
                ["App/App.csproj"] = """
                <Project Sdk="Microsoft.NET.Sdk.Web">
                  <PropertyGroup><AltinnAppVersion>9.3.0</AltinnAppVersion></PropertyGroup>
                  <ItemGroup><PackageReference Include="Altinn.App.Api" Version="$(AltinnAppVersion)" /></ItemGroup>
                </Project>
                """,
                ["Directory.Build.props"] = Properties("<AltinnAppVersion>8.12.0</AltinnAppVersion>"),
            }
        );

        Assert.Null(model.UnsupportedAppVersion);
        Assert.Equal("9.3.0", model.AltinnAppVersion);
    }

    [Fact]
    public void PropertyVersion_SelfReferencingProperty_IsUnresolvable()
    {
        var model = Build(
            new Dictionary<string, string>
            {
                ["App/App.csproj"] = ApiReference("$(AltinnAppVersion)"),
                ["Directory.Build.props"] = Properties("<AltinnAppVersion>$(AltinnAppVersion)</AltinnAppVersion>"),
            }
        );

        Assert.NotNull(model.UnsupportedAppVersion);
        Assert.Contains("could not determine", model.UnsupportedAppVersion.Reason, StringComparison.Ordinal);
    }

    [Fact]
    public void CentralPackageVersion_PropertyFromDirectoryBuildProps_Resolves()
    {
        var model = Build(
            new Dictionary<string, string>
            {
                ["App/App.csproj"] = Csproj("""<PackageReference Include="Altinn.App.Api" />"""),
                ["Directory.Packages.props"] = """
                <Project><ItemGroup><PackageVersion Include="Altinn.App.Api" Version="$(AltinnAppVersion)" /></ItemGroup></Project>
                """,
                ["Directory.Build.props"] = Properties("<AltinnAppVersion>9.4.0</AltinnAppVersion>"),
            }
        );

        Assert.Null(model.UnsupportedAppVersion);
        Assert.Equal("9.4.0", model.AltinnAppVersion);
    }

    [Fact]
    public void PropertyVersion_DefinedInParentDirectoryBuildPropsOutsideTheApp_ResolvesAndTracksEdits()
    {
        var parent = Directory.CreateTempSubdirectory("appconfig-props-");
        try
        {
            var appRoot = Path.Combine(parent.FullName, "my-app");
            Directory.CreateDirectory(Path.Combine(appRoot, "App", "config"));
            File.WriteAllText(Path.Combine(appRoot, "App", "config", "applicationmetadata.json"), TestMeta.Json());
            File.WriteAllText(Path.Combine(appRoot, "App", "App.csproj"), ApiReference("$(AltinnAppVersion)"));
            File.WriteAllText(
                Path.Combine(appRoot, "App", "Directory.Build.props"),
                Properties("<Nullable>enable</Nullable>")
            );
            var parentProps = Path.Combine(parent.FullName, "Directory.Build.props");
            File.WriteAllText(parentProps, Properties("<AltinnAppVersion>[9.5.0]</AltinnAppVersion>"));

            var engine = AppConfigEngine.Open(appRoot);

            Assert.Null(engine.Build().UnsupportedAppVersion);
            Assert.Equal("9.5.0", engine.Build().AltinnAppVersion);

            File.WriteAllText(parentProps, Properties("<AltinnAppVersion>[8.12.0]</AltinnAppVersion>"));

            var unsupported = engine.Build().UnsupportedAppVersion;
            Assert.NotNull(unsupported);
            Assert.Contains("Altinn.App.Api [8.12.0]", unsupported.Reason, StringComparison.Ordinal);
        }
        finally
        {
            parent.Delete(recursive: true);
        }
    }

    [Fact]
    public void UnsupportedVersion_StoresNothing()
    {
        var model = Build(ApiReference("8.12.0"));

        Assert.NotNull(model.UnsupportedAppVersion);
        Assert.Null(model.AltinnAppVersion);
    }

    [Fact]
    public void SourceBuild_StoresNothing()
    {
        var model = Build(Csproj("""<ProjectReference Include="../../app-lib/Altinn.App.Api.csproj" />"""));

        Assert.Null(model.UnsupportedAppVersion);
        Assert.Null(model.AltinnAppVersion);
    }
}
