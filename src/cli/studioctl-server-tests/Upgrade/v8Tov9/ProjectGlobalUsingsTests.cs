using Altinn.Studio.Cli.Upgrade.ProjectFile;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers <see cref="ProjectGlobalUsings.Read"/>: which namespaces a project imports globally, from the
/// SDK's implicit usings and the project's own <c>Using</c> items.
/// </summary>
public sealed class ProjectGlobalUsingsTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private IReadOnlySet<string> Read(string sdk, string properties, string items = "") =>
        ProjectGlobalUsings.Read(
            _app.Write(
                "App.csproj",
                $"""
                <Project Sdk="{sdk}">
                  <PropertyGroup>
                    <TargetFramework>net10.0</TargetFramework>
                    {properties}
                  </PropertyGroup>
                  <ItemGroup>
                    {items}
                  </ItemGroup>
                </Project>
                """
            )
        );

    [Fact]
    public void WebSdk_WithImplicitUsingsEnabled_ImportsTheBaseAndWebSets()
    {
        var namespaces = Read(
            "Microsoft.NET.Sdk.Web",
            "<ImplicitUsings>enable</ImplicitUsings>",
            "<Using Include=\"Altinn.App.Core.Features\" />"
        );

        Assert.Equal(17, namespaces.Count);
        Assert.Contains("System", namespaces);
        Assert.Contains("System.Threading.Tasks", namespaces);
        Assert.Contains("System.Net.Http.Json", namespaces);
        Assert.Contains("Microsoft.Extensions.Logging", namespaces);
        Assert.Contains("Altinn.App.Core.Features", namespaces);
    }

    [Fact]
    public void PlainSdk_ImportsOnlyTheBaseSet()
    {
        var namespaces = Read("Microsoft.NET.Sdk", "<ImplicitUsings>true</ImplicitUsings>");

        Assert.Equal(7, namespaces.Count);
        Assert.Contains("System.Linq", namespaces);
        Assert.DoesNotContain("Microsoft.AspNetCore.Builder", namespaces);
    }

    [Theory]
    [InlineData("")]
    [InlineData("<ImplicitUsings>disable</ImplicitUsings>")]
    [InlineData("<ImplicitUsings>false</ImplicitUsings>")]
    public void WithoutImplicitUsings_OnlyTheProjectsOwnItemsCount(string properties)
    {
        var namespaces = Read("Microsoft.NET.Sdk.Web", properties, "<Using Include=\"Altinn.App.Core.Features\" />");

        Assert.Equal(["Altinn.App.Core.Features"], namespaces);
    }

    [Fact]
    public void HonorsRemoveItems_AndSplitsItemLists()
    {
        var namespaces = Read(
            "Microsoft.NET.Sdk.Web",
            "<ImplicitUsings>enable</ImplicitUsings>",
            """
            <Using Remove="System.Net.Http;System.Net.Http.Json" />
            <Using Include="System.Text.Json; Altinn.App.Core.Features" />
            """
        );

        Assert.DoesNotContain("System.Net.Http", namespaces);
        Assert.DoesNotContain("System.Net.Http.Json", namespaces);
        Assert.Contains("System.Text.Json", namespaces);
        Assert.Contains("Altinn.App.Core.Features", namespaces);
    }

    [Fact]
    public void IgnoresStaticAndAliasedItems()
    {
        var namespaces = Read(
            "Microsoft.NET.Sdk.Web",
            "",
            """
            <Using Include="System.Math" Static="true" />
            <Using Include="System.Text.Json" Alias="Json" />
            """
        );

        Assert.Empty(namespaces);
    }
}
