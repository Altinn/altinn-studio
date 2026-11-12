using System;
using System.Globalization;
using System.Linq;
using System.Text;
using Altinn.Studio.Common.App;
using Altinn.Studio.Common.App.V8;
using Altinn.Studio.Common.App.V9;
using Xunit;

namespace Altinn.Studio.Common.Tests.App;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class AppDescriptionReaderTests
{
    private const string AppProject = """
        <Project Sdk="Microsoft.NET.Sdk.Web">
          <PropertyGroup>
            <TargetFramework>net8.0</TargetFramework>
          </PropertyGroup>
          <ItemGroup>
            <PackageReference Include="Altinn.App.Core" Version="8.1.0" />
            <PackageReference Include="Altinn.App.Api" Version="8.1.0">
              <CopyToOutputDirectory>lib\$(TargetFramework)\*.xml</CopyToOutputDirectory>
            </PackageReference>
            <PackageReference Include="Microsoft.VisualStudio.Azure.Containers.Tools.Targets" Version="1.19.6" />
          </ItemGroup>
        </Project>
        """;

    [Fact]
    public void Build_DescribesATypicalV8App()
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", AppProject);
        Read(reader, "App/views/Home/Index.cshtml", Index("4"));
        Read(reader, "App/ui/form/Settings.json", "{}");

        var description = Assert.IsType<AppDescription.FormApp.V8OrEarlier>(reader.Build());

        ProjectDescription.WellFormed project = WellFormed(Assert.Single(description.Projects));
        Assert.Same(project, description.AppProject);
        Assert.Equal("App/App.csproj", project.Path.Value);
        Assert.Equal(["net8.0"], project.TargetFrameworks);
        Assert.Equal("net8.0", description.TargetFramework);
        Assert.Equal(
            [
                new PackageReference("Altinn.App.Core", "8.1.0"),
                new PackageReference("Altinn.App.Api", "8.1.0"),
                new PackageReference("Microsoft.VisualStudio.Azure.Containers.Tools.Targets", "1.19.6"),
            ],
            project.PackageReferences
        );
        Assert.Equal(("Altinn.App.Api", "8.1.0", 8), Package(description));
        Assert.Equal("4", description.V8.FrontendVersion?.Value);
    }

    [Fact]
    public void Build_DescribesATypicalV9AppWithItsUiFolders()
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", Project("Altinn.App.Api", "9.0.0"));
        Read(reader, "App/views/Home/Index.cshtml", Index("4"));
        Read(reader, "App/ui/Task_2/Settings.json", "{}");
        Read(reader, "App/ui/Task_1/Settings.json", "{}");
        Assert.False(reader.Accepts(TestAppSource.Path("App/ui/Task_1/layouts/Side1.json")));
        Assert.False(reader.Accepts(TestAppSource.Path("App/ui/Settings.json")));
        Assert.False(reader.Accepts(TestAppSource.Path("App/ui/a/b/Settings.json")));

        var description = Assert.IsType<AppDescription.FormApp.V9OrLater>(reader.Build());

        Assert.Equal(("Altinn.App.Api", "9.0.0", 9), Package(description.AltinnApp));
        Assert.Equal(["Task_1", "Task_2"], description.V9.UiFolders);
    }

    [Theory]
    [InlineData("[8.0.0]", "8.0.0", 8)]
    [InlineData(" [ 7.4.1 ] ", "7.4.1", 7)]
    [InlineData("8.*", "8.*", 8)]
    [InlineData("9.0.0-preview.10", "9.0.0-preview.10", 9)]
    [InlineData("10.0.0+meta", "10.0.0+meta", 10)]
    [InlineData("8", "8", 8)]
    public void Build_ReadsTheMajorOfPinnedAndFloatingVersions(string declared, string version, int major)
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", Project("Altinn.App.Api", declared));

        Assert.Equal(("Altinn.App.Api", version, major), Package(reader.Build()));
    }

    [Theory]
    [InlineData("[8.0.0,9.0.0)")]
    [InlineData("[]")]
    [InlineData("latest")]
    [InlineData("v8.0.0")]
    [InlineData("1234567.0")]
    public void Build_DoesNotGuessTheContractOfAVersionWithoutAMajor(string declared)
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", Project("Altinn.App.Api", declared));
        Read(reader, "App/views/Home/Index.cshtml", Index("4"));

        var unknown = Assert.IsType<AppDescription.FormApp.UnknownVersion>(reader.Build());

        Assert.Equal(new PackageReference("Altinn.App.Api", declared.Trim()), unknown.Reference);
        Assert.Contains("names no major version", unknown.Reason, StringComparison.Ordinal);
        Assert.Equal("App/App.csproj", unknown.AppProject?.Path.Value);
    }

    [Fact]
    public void Build_DoesNotGuessTheContractOfAVersionThatCannotBeResolved()
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", Project("Altinn.App.Api", "$(Unresolved)"));

        var unknown = Assert.IsType<AppDescription.FormApp.UnknownVersion>(reader.Build());

        Assert.Equal(new PackageReference("Altinn.App.Api", null), unknown.Reference);
        Assert.Equal("the version of Altinn.App.Api cannot be resolved", unknown.Reason);
    }

    // Designer takes the first two for apps on v8, in AltinnAppGitRepository.GetSchemaUrl, ReleaseService and
    // AppVersionService. Here they are of no known kind, and a caller decides what to take them for.
    [Fact]
    public void Build_RecognizesAFormAppOnlyByItsAltinnAppPackage()
    {
        var wrapped = new AppDescriptionReader();
        Read(wrapped, "App/App.csproj", Project("Dibk.Ftpb.Common.AltinnApps", "1.7.5"));
        Read(wrapped, "App/views/Home/Index.cshtml", Index("4"));
        Read(wrapped, "App/ui/form/Settings.json", "{}");

        var custom = new AppDescriptionReader();
        Read(custom, "App/App.csproj", Project("Swashbuckle.AspNetCore", "10.1.7"));

        var provenV9 = new AppDescriptionReader();
        Read(provenV9, "App/App.csproj", Project("Altinn.App.Api", "9.0.0"));
        Read(provenV9, "App/views/Home/Index.cshtml", Index("4"));
        Read(provenV9, "App/ui/Task_1/Settings.json", "{}");

        var wrappedApp = Assert.IsType<AppDescription.Unrecognized>(wrapped.Build());
        Assert.Equal("App/App.csproj", wrappedApp.AppProject?.Path.Value);

        Assert.IsType<AppDescription.Unrecognized>(custom.Build());

        var v9App = Assert.IsType<AppDescription.FormApp.V9OrLater>(provenV9.Build());
        Assert.Equal(["Task_1"], v9App.V9.UiFolders);
    }

    [Fact]
    public void Build_ResolvesPropertiesFromTheProjectAndDirectoryBuildProps()
    {
        var reader = new AppDescriptionReader();
        Read(
            reader,
            "Directory.Build.props",
            "<Project><PropertyGroup><Patch>3</Patch><AltinnVersion>8.2.$(Patch)</AltinnVersion></PropertyGroup></Project>"
        );
        Read(
            reader,
            "App/App.csproj",
            """
            <Project>
              <PropertyGroup><Tfm>net8.0</Tfm><TargetFramework>$(Tfm)</TargetFramework></PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api.Experimental"><Version>$(AltinnVersion)</Version></PackageReference>
                <PackageReference Include="Unknown" Version="$(NotSet)" />
                <PackageReference Include="Function" Version="$([System.String]::Copy('1.0.0'))" />
              </ItemGroup>
            </Project>
            """
        );

        AppDescription description = reader.Build();

        Assert.Equal(("Altinn.App.Api.Experimental", "8.2.3", 8), Package(description));
        Assert.Equal("net8.0", description.TargetFramework);
        Assert.Equal(
            [
                new PackageReference("Altinn.App.Api.Experimental", "8.2.3"),
                new PackageReference("Unknown", null),
                new PackageReference("Function", null),
            ],
            WellFormed(description.Projects[0]).PackageReferences
        );
    }

    [Fact]
    public void Build_UsesCentralPackageVersionsAndOverrides()
    {
        var reader = new AppDescriptionReader();
        Read(
            reader,
            "Directory.Packages.props",
            """
            <Project>
              <PropertyGroup><ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally></PropertyGroup>
              <ItemGroup>
                <PackageVersion Include="Altinn.App.Api" Version="8.5.0" />
                <PackageVersion Include="Newtonsoft.Json" Version="13.0.3" />
              </ItemGroup>
            </Project>
            """
        );
        Read(
            reader,
            "App/App.csproj",
            """
            <Project>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" />
                <PackageReference Include="Newtonsoft.Json" VersionOverride="13.0.1" />
              </ItemGroup>
            </Project>
            """
        );

        AppDescription description = reader.Build();

        Assert.Equal(
            [new PackageReference("Altinn.App.Api", "8.5.0"), new PackageReference("Newtonsoft.Json", "13.0.1")],
            WellFormed(description.Projects[0]).PackageReferences
        );
    }

    // Central package management is off until a property turns it on, and NuGet then ignores the central versions.
    [Theory]
    [InlineData("")]
    [InlineData(
        "<PropertyGroup><ManagePackageVersionsCentrally>false</ManagePackageVersionsCentrally></PropertyGroup>"
    )]
    public void Build_IgnoresCentralVersionsWhenTheyAreNotTurnedOn(string properties)
    {
        var reader = new AppDescriptionReader();
        Read(
            reader,
            "Directory.Packages.props",
            "<Project><ItemGroup><PackageVersion Include=\"Altinn.App.Api\" Version=\"9.0.0\" /></ItemGroup></Project>"
        );
        Read(
            reader,
            "App/App.csproj",
            $"<Project>{properties}<ItemGroup><PackageReference Include=\"Altinn.App.Api\" VersionOverride=\"9.1.0\" /></ItemGroup></Project>"
        );

        var unknown = Assert.IsType<AppDescription.FormApp.UnknownVersion>(reader.Build());
        Assert.Null(unknown.Reference.Version);
    }

    // MSBuild sets properties in order, so a property has the values that others had where it was set. It reads the
    // items after every property, so an item has the values the properties have in the end.
    [Theory]
    [InlineData("<A>8.0.0</A><B>$(A)</B><A>9.0.0</A>", "$(B)", "8.0.0")]
    [InlineData("<A>8.0.0</A><B>$(A)</B><A>9.0.0</A>", "$(A)", "9.0.0")]
    [InlineData("<B>$(A)</B><A>8.0.0</A>", "$(B)", null)]
    [InlineData("<A>$(A)</A>", "$(A)", null)]
    [InlineData("<A>8</A><B>$(A).$(A)</B><A>$(B).0</A>", "$(A)", "8.8.0")]
    public void Build_ResolvesAPropertyWhereItIsSet(string properties, string declared, string? version)
    {
        var reader = new AppDescriptionReader();
        Read(
            reader,
            "App/App.csproj",
            $"<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"{declared}\" /></ItemGroup>"
                + $"<PropertyGroup>{properties}</PropertyGroup></Project>"
        );

        Assert.Equal(
            [new PackageReference("Altinn.App.Api", version)],
            WellFormed(reader.Build().Projects[0]).PackageReferences
        );
    }

    [Fact]
    public void Build_GivesUpOnPropertiesThatGrowByRepeatingEachOther()
    {
        var properties = new StringBuilder("<P0>8</P0>");
        for (int i = 1; i <= 40; i++)
        {
            properties.Append(CultureInfo.InvariantCulture, $"<P{i}>$(P{i - 1})$(P{i - 1})</P{i}>");
        }

        var reader = new AppDescriptionReader();
        Read(
            reader,
            "App/App.csproj",
            $"<Project><PropertyGroup>{properties}</PropertyGroup>"
                + "<ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"$(P40)\" /></ItemGroup></Project>"
        );

        var unknown = Assert.IsType<AppDescription.FormApp.UnknownVersion>(reader.Build());
        Assert.Null(unknown.Reference.Version);
    }

    [Theory]
    [InlineData("<PackageReference Update=\"altinn.app.api\" Version=\"9.0.0\" />", "9.0.0")]
    [InlineData(
        "<PackageReference Update=\"Other;Altinn.App.Api\"><Version>9.0.0</Version></PackageReference>",
        "9.0.0"
    )]
    [InlineData("<PackageReference Update=\"Altinn.App.Api\" PrivateAssets=\"all\" />", "8.0.0")]
    [InlineData("<PackageReference Update=\"Other\" Version=\"9.0.0\" />", "8.0.0")]
    [InlineData("<PackageReference Update=\"@(PackageReference)\" Version=\"9.0.0\" />", null)]
    [InlineData("<PackageReference Update=\"Altinn.*\" Version=\"9.0.0\" />", null)]
    [InlineData("<PackageReference Update=\"Altinn.App.Api\" Version=\"9.0.0\" Condition=\"'$(X)' == ''\" />", null)]
    public void Build_AppliesAnUpdateToAReferenceOfDirectoryBuildProps(string update, string? version)
    {
        var reader = new AppDescriptionReader();
        Read(
            reader,
            "Directory.Build.props",
            "<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"8.0.0\" /></ItemGroup></Project>"
        );
        Read(reader, "App/App.csproj", $"<Project><ItemGroup>{update}</ItemGroup></Project>");

        Assert.Equal(
            [new PackageReference("Altinn.App.Api", version)],
            WellFormed(reader.Build().Projects[0]).PackageReferences
        );
    }

    [Fact]
    public void Build_AppliesARemove()
    {
        var reader = new AppDescriptionReader();
        Read(
            reader,
            "App/App.csproj",
            "<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"8.0.0\" />"
                + "<PackageReference Include=\"Other\" Version=\"1.0.0\" />"
                + "<PackageReference Remove=\"Altinn.App.Api\" /></ItemGroup></Project>"
        );

        var description = Assert.IsType<AppDescription.Unrecognized>(reader.Build());
        Assert.Equal([new PackageReference("Other", "1.0.0")], WellFormed(description.Projects[0]).PackageReferences);
    }

    // Whether a condition holds is not known without evaluating the project, so what it decides is not known either.
    [Theory]
    [InlineData(
        "<PropertyGroup><V>8.0.0</V><V Condition=\"'1' == '2'\">9.0.0</V></PropertyGroup>",
        "<PackageReference Include=\"Altinn.App.Api\" Version=\"$(V)\" />"
    )]
    [InlineData(
        "<PropertyGroup><V>8.0.0</V></PropertyGroup><PropertyGroup Condition=\"'1' == '2'\"><V>9.0.0</V></PropertyGroup>",
        "<PackageReference Include=\"Altinn.App.Api\" Version=\"$(V)\" />"
    )]
    [InlineData("", "<PackageReference Include=\"Altinn.App.Api\" Version=\"9.0.0\" Condition=\"'1' == '2'\" />")]
    [InlineData(
        "",
        "<PackageReference Include=\"Altinn.App.Api\" Version=\"8.0.0\" /></ItemGroup><ItemGroup Condition=\"'1' == '2'\">"
            + "<PackageReference Include=\"Altinn.App.Api\" Version=\"9.0.0\" />"
    )]
    public void Build_TakesWhatAConditionDecidesForUnknown(string properties, string items)
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", $"<Project>{properties}<ItemGroup>{items}</ItemGroup></Project>");

        var unknown = Assert.IsType<AppDescription.FormApp.UnknownVersion>(reader.Build());
        Assert.Null(unknown.Reference.Version);
    }

    // MSBuild imports the nearest Directory.Build.props and stops there, so one that is malformed hides the ones above.
    [Fact]
    public void Build_StopsAtTheNearestPropsAlsoWhenItIsMalformed()
    {
        var reader = new AppDescriptionReader();
        Read(reader, "Directory.Build.props", "<Project><PropertyGroup><V>9.0.0</V></PropertyGroup></Project>");
        Read(reader, "App/Directory.Build.props", "not xml");
        Read(
            reader,
            "App/App.csproj",
            "<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"$(V)\" /></ItemGroup></Project>"
        );

        var unknown = Assert.IsType<AppDescription.FormApp.UnknownVersion>(reader.Build());
        Assert.Null(unknown.Reference.Version);
    }

    [Fact]
    public void Build_TakesTheAltinnPackageOfTheAppProjectBeforeAnotherProjects()
    {
        var reader = new AppDescriptionReader();
        Read(
            reader,
            "App.IntegrationTests/App.IntegrationTests.csproj",
            "<Project><PropertyGroup><TargetFrameworks>net8.0;net9.0</TargetFrameworks></PropertyGroup>"
                + "<ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"7.0.0\" /></ItemGroup></Project>"
        );
        Read(reader, "App/App.csproj", Project("Altinn.App.Core", "8.0.0"));

        AppDescription description = reader.Build();

        Assert.Equal(
            ["App.IntegrationTests/App.IntegrationTests.csproj", "App/App.csproj"],
            description.Projects.Select(p => p.Path.Value)
        );
        Assert.Equal("App/App.csproj", description.AppProject?.Path.Value);
        Assert.Equal(("Altinn.App.Core", "8.0.0", 8), Package(description));
        Assert.Equal(["net8.0", "net9.0"], WellFormed(description.Projects[0]).TargetFrameworks);
        Assert.Null(description.TargetFramework);
    }

    [Fact]
    public void Build_TakesTheAltinnPackageOfAnotherProjectWhenTheAppProjectHasNone()
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", Project("Dibk.Ftpb.Common.AltinnApps", "1.0.0"));
        Read(reader, "Shared/Shared.csproj", Project("Altinn.App.Core", "8.0.0"));

        AppDescription description = reader.Build();

        Assert.Equal("App/App.csproj", description.AppProject?.Path.Value);
        Assert.Equal(("Altinn.App.Core", "8.0.0", 8), Package(description));
    }

    // The layouts are those of apps deployed to production and tt02.
    [Theory]
    [InlineData("App/App.csproj", "App/App.csproj")]
    [InlineData("App/App.csproj;Tests/Tests.csproj", "App/App.csproj")]
    [InlineData("App.Tests/App.Tests.csproj;App/App.csproj", "App/App.csproj")]
    [InlineData("App/App.csproj;App/SSB.Utils.csproj", "App/App.csproj")]
    [InlineData("app/app.csproj", "app/app.csproj")]
    [InlineData("App/AltinnOkonomiRegelverk.csproj", "App/AltinnOkonomiRegelverk.csproj")]
    [InlineData(
        "App/Innsending.Planforslag.Web.csproj;Innsending.Planforslag.Web.Tests/Innsending.Planforslag.Web.Tests.csproj;"
            + "Innsending.Planforslag.XmlSchemaValidator/Innsending.Planforslag.XmlSchemaValidator.csproj",
        "App/Innsending.Planforslag.Web.csproj"
    )]
    [InlineData("Some.Api/Some.Api.csproj", "Some.Api/Some.Api.csproj")]
    [InlineData("App/One.csproj;App/Two.csproj", null)]
    [InlineData("Api/Api.csproj;Tests/Tests.csproj", null)]
    [InlineData("", null)]
    public void Build_FindsTheProjectTheAppIsBuiltFrom(string paths, string? expected)
    {
        var reader = new AppDescriptionReader();
        foreach (string path in paths.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            Read(
                reader,
                path,
                "<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>"
            );
        }

        AppDescription description = reader.Build();

        Assert.Equal(expected, description.AppProject?.Path.Value);
        Assert.Equal(expected is null ? null : "net8.0", description.TargetFramework);
        Assert.Equal(paths.Split(';', StringSplitOptions.RemoveEmptyEntries).Length, description.Projects.Count);
    }

    [Theory]
    [InlineData("Altinn.App.Api", "8.5.0", "Altinn.App.Api", 8)]
    [InlineData("altinn.app.core", "9.0.0-preview.3", "Altinn.App.Core", 9)]
    [InlineData("Altinn.App.Core.Experimental", "8.*", "Altinn.App.Core.Experimental", 8)]
    [InlineData("Newtonsoft.Json", "13.0.1", null, 0)]
    [InlineData("Altinn.App.Models", "8.0.0", null, 0)]
    [InlineData("Dibk.Ftpb.Common.AltinnApps", "8.0.0", null, 0)]
    [InlineData("Altinn.App.Api", null, null, 0)]
    [InlineData("Altinn.App.Api", "[8.0.0,9.0.0)", null, 0)]
    // NuGet's versions of one to four numbers, and its floating versions.
    [InlineData("Altinn.App.Api", "8", "Altinn.App.Api", 8)]
    [InlineData("Altinn.App.Api", "8.5", "Altinn.App.Api", 8)]
    [InlineData("Altinn.App.Api", "8.5.0.1", "Altinn.App.Api", 8)]
    [InlineData("Altinn.App.Api", "8.5.*", "Altinn.App.Api", 8)]
    [InlineData("Altinn.App.Api", "9.0.0-*", "Altinn.App.Api", 9)]
    [InlineData("Altinn.App.Api", "9.0.0-preview.*", "Altinn.App.Api", 9)]
    [InlineData("Altinn.App.Api", "9.0.0-preview*", "Altinn.App.Api", 9)]
    [InlineData("Altinn.App.Api", "9.*-*", "Altinn.App.Api", 9)]
    [InlineData("Altinn.App.Api", "8.5+build", "Altinn.App.Api", 8)]
    // What only starts like a version names no major version.
    [InlineData("Altinn.App.Api", "9.broken", null, 0)]
    [InlineData("Altinn.App.Api", "9.", null, 0)]
    [InlineData("Altinn.App.Api", "9..0", null, 0)]
    [InlineData("Altinn.App.Api", "9+", null, 0)]
    [InlineData("Altinn.App.Api", "9.0.0-", null, 0)]
    [InlineData("Altinn.App.Api", "9.0.0-.*", null, 0)]
    [InlineData("Altinn.App.Api", "9.*.0", null, 0)]
    [InlineData("Altinn.App.Api", "*", null, 0)]
    [InlineData("Altinn.App.Api", "9.0.0.0.0", null, 0)]
    [InlineData("Altinn.App.Api", "9.0.0+build*", null, 0)]
    [InlineData("Altinn.App.Api", "1234567.0", null, 0)]
    public void AltinnAppPackage_IsOnlyAReferenceToAnAltinnAppPackageWithAMajorVersion(
        string name,
        string? version,
        string? expectedName,
        int expectedMajor
    )
    {
        bool parsed = AltinnAppPackage.TryParse(new PackageReference(name, version), out AltinnAppPackage? package);

        Assert.Equal(expectedName is not null, parsed);
        Assert.Equal(expectedName, package?.Name);
        Assert.Equal(expectedName is null ? null : expectedMajor, package?.Major);
    }

    [Theory]
    [InlineData("8.5.0", true)]
    [InlineData("8.10.0-pr.4153.instance-contextual-layout-fetching.bffb1113", true)]
    [InlineData("9.0.0-preview.10", true)]
    [InlineData("8.*", false)]
    [InlineData("8.5", false)]
    public void AltinnAppPackage_HasASemanticVersionWhenItNamesOneVersion(string version, bool expected)
    {
        Assert.True(AltinnAppPackage.TryParse(new PackageReference("Altinn.App.Api", version), out var package));

        Assert.Equal(expected ? version : null, package.SemanticVersion?.Value);
        Assert.Equal(8 + (version.StartsWith('9') ? 1 : 0), package.Major);
    }

    [Fact]
    public void Build_ReadsOldStyleProjectsWithTheMsBuildNamespace()
    {
        var reader = new AppDescriptionReader();
        Read(
            reader,
            "App/App.csproj",
            """
            <?xml version="1.0" encoding="utf-8"?>
            <Project ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
              <PropertyGroup><TargetFramework>netcoreapp3.1</TargetFramework></PropertyGroup>
              <ItemGroup><PackageReference Include="Altinn.App.Api" Version="3.1.4" /></ItemGroup>
            </Project>
            """
        );

        AppDescription description = reader.Build();

        Assert.Equal(("Altinn.App.Api", "3.1.4", 3), Package(description));
        Assert.Equal("netcoreapp3.1", description.TargetFramework);
    }

    [Theory]
    [InlineData(
        "Directory.Packages.props",
        "<Project><PropertyGroup><ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally></PropertyGroup>"
            + "<ItemGroup><PackageVersion Include=\"Altinn.App.Api\" Version=\"9.0.0\" /></ItemGroup></Project>",
        "<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" /></ItemGroup></Project>"
    )]
    [InlineData(
        "Directory.Build.props",
        "<Project><PropertyGroup><AltinnApp>9.0.0</AltinnApp></PropertyGroup></Project>",
        "<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"$(AltinnApp)\" /></ItemGroup></Project>"
    )]
    public void Read_ForgetsPropsThatAreMalformedWhenReadAgain(string propsPath, string props, string project)
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", project);
        Read(reader, propsPath, props);
        Assert.IsType<AppDescription.FormApp.V9OrLater>(reader.Build());

        Read(reader, propsPath, "not xml");

        var unknown = Assert.IsType<AppDescription.FormApp.UnknownVersion>(reader.Build());
        Assert.Null(unknown.Reference.Version);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not xml")]
    [InlineData("<Project><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"8.0.0\"></ItemGroup>")]
    [InlineData("<Project><!DOCTYPE x [<!ENTITY a \"b\">]></Project>")]
    [InlineData("<?xml version=\"1.0\"?><!DOCTYPE Project SYSTEM \"http://example.com/x.dtd\"><Project>&a;</Project>")]
    public void Build_TreatsMalformedProjectsAsMalformed(string content)
    {
        var reader = new AppDescriptionReader();
        Read(reader, "App/App.csproj", content);

        AppDescription description = reader.Build();

        Assert.IsType<ProjectDescription.Malformed>(Assert.Single(description.Projects));
        Assert.IsType<ProjectDescription.Malformed>(description.AppProject);
        Assert.Null(description.TargetFramework);
        Assert.IsType<AppDescription.Unrecognized>(description);
    }

    [Fact]
    public void Read_GivesTheSameDescriptionFromTextAsFromBytes()
    {
        var fromBytes = new AppDescriptionReader();
        var fromText = new AppDescriptionReader();
        string bom = "﻿";
        (string Path, string Content)[] files =
        [
            ("App/App.csproj", bom + "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + AppProject),
            ("App/views/Home/Index.cshtml", Index("4.11.2")),
            ("Directory.Build.props", "<Project><PropertyGroup><X>1</X></PropertyGroup></Project>"),
        ];

        foreach ((string path, string content) in files)
        {
            Read(fromBytes, path, content);
            var parsed = TestAppSource.Path(path);
            Assert.True(fromText.Accepts(parsed));
            fromText.Read(parsed, content);
        }

        var bytes = Assert.IsType<AppDescription.FormApp.V8OrEarlier>(fromBytes.Build());
        var text = Assert.IsType<AppDescription.FormApp.V8OrEarlier>(fromText.Build());
        Assert.Equal(bytes.AltinnApp, text.AltinnApp);
        Assert.Equal(bytes.V8, text.V8);
        Assert.Equal(WellFormed(bytes.Projects[0]).PackageReferences, WellFormed(text.Projects[0]).PackageReferences);
    }

    [Fact]
    public void Build_WithoutFilesDescribesNothing()
    {
        var description = Assert.IsType<AppDescription.Unrecognized>(new AppDescriptionReader().Build());

        Assert.Empty(description.Projects);
        Assert.Null(description.AppProject);
        Assert.Null(description.TargetFramework);
    }

    [Theory]
    [InlineData("App/App.csproj", true)]
    [InlineData("src/Other.CSPROJ", true)]
    [InlineData("Directory.Build.props", true)]
    [InlineData("App/directory.packages.props", true)]
    [InlineData("App/views/Home/Index.cshtml", true)]
    [InlineData("App/ui/Task_1/Settings.json", true)]
    [InlineData("App/views/Home/Other.cshtml", false)]
    [InlineData("App/Directory.Build.targets", false)]
    [InlineData("App/App.csproj.user", false)]
    [InlineData("App/config/applicationmetadata.json", false)]
    public void Accepts_OnlyTheFilesItReads(string path, bool expected)
    {
        Assert.Equal(expected, new AppDescriptionReader().Accepts(TestAppSource.Path(path)));
    }

    private static (string, string, int) Package(AppDescription description) =>
        description switch
        {
            AppDescription.FormApp.V8OrEarlier v8 => Package(v8.AltinnApp),
            AppDescription.FormApp.V9OrLater v9 => Package(v9.AltinnApp),
            _ => throw new InvalidOperationException($"The version is unknown: {description}"),
        };

    private static (string, string, int) Package(AltinnAppPackage package) =>
        (package.Name, package.Version, package.Major);

    private static ProjectDescription.WellFormed WellFormed(ProjectDescription project) =>
        Assert.IsType<ProjectDescription.WellFormed>(project);

    private static string Project(string package, string version) =>
        $"<Project><ItemGroup><PackageReference Include=\"{package}\" Version=\"{version}\" /></ItemGroup></Project>";

    private static string Index(string version) =>
        $"<html><body><script src=\"https://altinncdn.no/toolkits/altinn-app-frontend/{version}/altinn-app-frontend.js\"></script></body></html>";

    private static void Read(AppDescriptionReader reader, string path, string content)
    {
        var parsed = TestAppSource.Path(path);
        Assert.True(reader.Accepts(parsed));
        reader.Read(parsed, new ReadOnlyMemory<byte>(Encoding.UTF8.GetBytes(content)));
    }
}
