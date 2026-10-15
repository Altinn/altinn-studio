using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Confirms the upgrade runs <see cref="HiddenDataRemovalAdvisor"/>, after the layout migration has turned
/// RuleConfiguration.json conditional rendering into hidden expressions.
/// </summary>
public sealed class V8Tov9UpgradeHiddenDataRemovalWiringTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<UpgradeReport> RunUpgrade()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.8.0" />
                <PackageReference Include="Altinn.App.Core" Version="8.8.0" />
              </ItemGroup>
            </Project>
            """
        );

        var report = new UpgradeReport();
        await V8Tov9Upgrade.RunAsync(
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
        return report;
    }

    private static IReadOnlyList<string> StepMessages(UpgradeReport report) =>
        [
            .. Assert
                .Single(report.Steps, step => step.Name == "Hidden data removal")
                .Messages.Where(message => message.Status == UpgradeMessageStatus.Warning)
                .Select(message => message.Text),
        ];

    [Fact]
    public async Task Upgrade_WarnsAboutAComponentHiddenByAConvertedRule()
    {
        _app.Write(
            "ui/form/layouts/Page1.json",
            """
            { "data": { "layout": [
              { "id": "target", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Target" } }
            ] } }
            """
        );
        _app.Write(
            "ui/form/RuleConfiguration.json",
            """
            {
              "data": {
                "conditionalRendering": {
                  "legacy-rule": {
                    "selectedFunction": "hideWhenYes",
                    "inputParams": { "value": "Model.Value" },
                    "selectedAction": "Hide",
                    "selectedFields": { "target": "target" }
                  }
                }
              }
            }
            """
        );
        _app.Write(
            "ui/form/RuleHandler.js",
            """
            var conditionalRuleHandlerObject = {
              hideWhenYes: function (obj) { return obj.value === "yes"; }
            };
            """
        );
        _app.Write(
            "ui/layout-sets.json",
            """{ "sets": [ { "id": "form", "dataType": "Main", "tasks": ["Task_1"] } ] }"""
        );

        var warning = Assert.Single(StepMessages(await RunUpgrade()));

        // The rule became a hidden expression, and the layout set moved to the task's UI folder first.
        Assert.Contains($"{Path.Combine("App", "ui", "Task_1", "layouts", "Page1.json")}: target", warning);
    }

    [Fact]
    public async Task Upgrade_IsQuietWithoutHiddenData()
    {
        _app.Write(
            "ui/form/layouts/Page1.json",
            """
            { "data": { "layout": [
              { "id": "target", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Target" } }
            ] } }
            """
        );

        Assert.Empty(StepMessages(await RunUpgrade()));
    }
}
