using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class V8Tov9UpgradeNavigationValidationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Theory]
    [InlineData("Required", true)]
    [InlineData("All", false)]
    public async Task Upgrade_ChecksMigratedGlobalSettingsAndReportsTheFinalFilePath(
        string inheritedCategory,
        bool requiresReview
    )
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>
              <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
              <PackageReference Include="Altinn.App.Core" Version="9.0.0" />
            </ItemGroup></Project>
            """
        );
        _app.Write(
            "ui/layout-sets.json",
            $$$"""
            {
              "sets": [{ "id": "form", "dataType": "Model", "tasks": ["Task_1"] }],
              "uiSettings": { "validationOnNavigation": { "page": "current", "show": ["{{{inheritedCategory}}}"] } }
            }
            """
        );
        _app.Write("ui/form/Settings.json", """{"pages":{"order":["A","B","C"]}}""");
        _app.Write(
            "ui/form/layouts/B.json",
            """
            { "data": { "layout": [
              { "id": "navigation", "type": "NavigationButtons", "validateOnNext": { "page": "current", "show": ["All"] } }
            ] } }
            """
        );
        var report = new UpgradeReport();

        var exitCode = await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: new StringWriter(),
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        var step = Assert.Single(report.Steps, step => step.Name == "Navigation validation");
        var message = Assert.Single(step.Messages);
        Assert.Equal(requiresReview ? UpgradeMessageStatus.Todo : UpgradeMessageStatus.Skip, message.Status);
        Assert.False(File.Exists(Path.Combine(_app.Root, "App/ui/layout-sets.json")));
        var component = JsonNode.Parse(_app.Read("ui/Task_1/layouts/B.json"))?["data"]?["layout"]?[0];
        Assert.Equal("All", component?["validateOnNext"]?["show"]?[0]?.GetValue<string>());
        if (requiresReview)
        {
            Assert.Equal(3, exitCode);
            Assert.Contains("App/ui/Task_1/layouts/B.json", message.Text, StringComparison.Ordinal);
            Assert.Contains("App/ui/Settings.json", message.Text, StringComparison.Ordinal);
        }
        else
        {
            Assert.DoesNotContain("equivalent", message.Text, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("navigation'", message.Text, StringComparison.Ordinal);
        }
    }
}
