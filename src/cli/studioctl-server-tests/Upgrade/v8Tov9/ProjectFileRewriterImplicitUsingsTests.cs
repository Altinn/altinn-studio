using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.ProjectFile;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the csproj output of <see cref="ProjectFileRewriter.EnableImplicitUsings"/>: the property is
/// switched on, the global <c>Using</c> item is added next to any existing ones, and a project that
/// already has both is left byte-for-byte untouched so the v9 upgrade can be run again.
/// </summary>
public sealed class ProjectFileRewriterImplicitUsingsTests : IDisposable
{
    private const string Features = "Altinn.App.Core.Features";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private static XElement Root(XDocument doc)
    {
        Assert.NotNull(doc.Root);
        return doc.Root;
    }

    private static string? ImplicitUsings(XDocument doc) =>
        doc.Root?.Elements("PropertyGroup").Elements("ImplicitUsings").SingleOrDefault()?.Value;

    private static string[] GlobalUsings(XDocument doc) =>
        doc.Root?.Elements("ItemGroup").Elements("Using").Select(u => u.Attribute("Include")?.Value ?? "").ToArray()
        ?? [];

    [Fact]
    public async Task EnableImplicitUsings_AddsPropertyAndGlobalUsing_ToATemplateShapedProject()
    {
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <Nullable>enable</Nullable>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
              </ItemGroup>
              <PropertyGroup>
                <GenerateDocumentationFile>true</GenerateDocumentationFile>
              </PropertyGroup>
            </Project>
            """
        );

        var change = await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features);

        Assert.True(change.EnabledImplicitUsings);
        Assert.Equal([Features], change.AddedNamespaces);

        var doc = XDocument.Load(csproj);
        Assert.Equal("enable", ImplicitUsings(doc));
        Assert.Equal([Features], GlobalUsings(doc));

        // The property joins the group that holds TargetFramework and the Using item follows it,
        // so the compile settings stay together at the top instead of trailing the build targets.
        var children = Root(doc).Elements().ToList();
        Assert.Contains(children[0].Elements(), e => e.Name == "ImplicitUsings");
        Assert.Equal("ItemGroup", children[1].Name.LocalName);
        Assert.Contains(children[1].Elements(), e => e.Name == "Using");
    }

    [Fact]
    public async Task EnableImplicitUsings_LeavesAnUpgradedProjectUntouched()
    {
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <ImplicitUsings>enable</ImplicitUsings>
              </PropertyGroup>
              <ItemGroup>
                <Using Include="Altinn.App.Core.Features" />
              </ItemGroup>
            </Project>
            """
        );
        var before = await File.ReadAllTextAsync(csproj, TestContext.Current.CancellationToken);

        var change = await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features);

        Assert.False(change.Any);
        Assert.Equal(before, await File.ReadAllTextAsync(csproj, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task EnableImplicitUsings_IsIdempotent_AcrossRuns()
    {
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """
        );

        Assert.True((await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features)).Any);
        var afterFirstRun = await File.ReadAllTextAsync(csproj, TestContext.Current.CancellationToken);

        Assert.False((await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features)).Any);
        Assert.Equal(afterFirstRun, await File.ReadAllTextAsync(csproj, TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData("disable")]
    [InlineData("false")]
    public async Task EnableImplicitUsings_TurnsOnAnExplicitlyDisabledProperty(string value)
    {
        var csproj = _app.Write(
            "App.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <ImplicitUsings>{value}</ImplicitUsings>
              </PropertyGroup>
            </Project>
            """
        );

        var change = await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features);

        Assert.True(change.EnabledImplicitUsings);
        var doc = XDocument.Load(csproj);
        Assert.Equal("enable", ImplicitUsings(doc));
        Assert.Single(Root(doc).Elements("PropertyGroup").Elements("ImplicitUsings"));
    }

    [Fact]
    public async Task EnableImplicitUsings_AppendsToTheItemGroupThatAlreadyHoldsGlobalUsings()
    {
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <ImplicitUsings>enable</ImplicitUsings>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
              </ItemGroup>
              <ItemGroup>
                <Using Include="System.Text.Json" />
              </ItemGroup>
            </Project>
            """
        );

        var change = await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features);

        Assert.False(change.EnabledImplicitUsings);
        Assert.Equal([Features], change.AddedNamespaces);

        var doc = XDocument.Load(csproj);
        Assert.Equal(["System.Text.Json", Features], GlobalUsings(doc));
        Assert.Single(Root(doc).Elements("ItemGroup"), g => g.Elements("Using").Any());
    }

    [Fact]
    public async Task EnableImplicitUsings_DoesNotCountAnAliasedOrStaticItem()
    {
        // 'global using Features = Altinn.App.Core.Features;' does not put IDataProcessor & co in
        // scope by their plain names, so the plain namespace import is still added next to it.
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <ImplicitUsings>enable</ImplicitUsings>
              </PropertyGroup>
              <ItemGroup>
                <Using Include="Altinn.App.Core.Features" Alias="Features" />
                <Using Include="Altinn.App.Core.Features" Static="true" />
              </ItemGroup>
            </Project>
            """
        );

        var change = await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features);

        Assert.Equal([Features], change.AddedNamespaces);
        var usings = XDocument.Load(csproj).Descendants("Using").ToList();
        Assert.Equal(3, usings.Count);
        Assert.Single(usings, u => u.Attribute("Alias") is null && u.Attribute("Static") is null);
    }

    [Fact]
    public async Task EnableImplicitUsings_RecognizesTheNamespaceInsideAnItemList()
    {
        // An MSBuild Include is a semicolon-separated item list; a Using declared that way must not
        // be duplicated as a second item.
        var csproj = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <ImplicitUsings>enable</ImplicitUsings>
              </PropertyGroup>
              <ItemGroup>
                <Using Include="System.Text.Json; Altinn.App.Core.Features" />
              </ItemGroup>
            </Project>
            """
        );

        var change = await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features);

        Assert.False(change.Any);
        Assert.Single(XDocument.Load(csproj).Descendants("Using"));
    }

    [Fact]
    public async Task EnableImplicitUsings_CreatesAPropertyGroup_WhenTheProjectHasNone()
    {
        var csproj = _app.Write("App.csproj", "<Project Sdk=\"Microsoft.NET.Sdk.Web\"></Project>");

        var change = await new ProjectFileRewriter(csproj).EnableImplicitUsings(Features);

        Assert.True(change.Any);
        var doc = XDocument.Load(csproj);
        Assert.Equal("enable", ImplicitUsings(doc));
        Assert.Equal([Features], GlobalUsings(doc));
    }
}
