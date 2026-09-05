using System.Text;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingRules;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class V8Tov9LayoutPipelineTests : IDisposable
{
    private const string LayoutPath = "ui/Task_1/layouts/Page1.json";
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task FailedRuleConversionRunsLastPreservesSourcesAndIsIdempotent()
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
        var layout =
            """
                {
                  "data": {
                    "layout": [
                      { "id": "target", "type": "Header" },
                      { "id": "navigation", "type": "NavigationButtons", "showBackButton": true },
                      { "id": "organization", "type": "OrganisationLookup", "dataModelBindings": { "organisation_lookup_orgnr": "Party.OrgNumber" } }
                    ]
                  }
                }
                """.Replace("\n", "\r\n", StringComparison.Ordinal) + "\r\n";
        _app.WriteBytes(LayoutPath, Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(layout)).ToArray());
        _app.Write(
            "ui/Task_1/RuleConfiguration.json",
            """
            {
              "data": {
                "conditionalRendering": {
                  "legacy-rule": {
                    "selectedFunction": "cannotConvert",
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
            "ui/Task_1/RuleHandler.js",
            """
            var conditionalRuleHandlerObject = {
              cannotConvert: function (obj) { return new Date() > obj.value; }
            };
            """
        );
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "sets": [
                { "id": "Task_1", "dataType": "Main", "tasks": ["Task_2"] }
              ]
            }
            """
        );
        _app.CommitEverything();

        var first = await RunUpgrade();

        Assert.Equal(3, first.ExitCode);
        var firstBytes = _app.ReadBytes(LayoutPath);
        var firstText = Encoding.UTF8.GetString(firstBytes);
        Assert.True(firstBytes.AsSpan().StartsWith(Encoding.UTF8.GetPreamble()));
        Assert.DoesNotContain("\n", firstText.Replace("\r\n", "", StringComparison.Ordinal), StringComparison.Ordinal);
        Assert.EndsWith("\r\n", firstText, StringComparison.Ordinal);
        Assert.Contains("\"type\": \"Heading\"", firstText, StringComparison.Ordinal);
        Assert.DoesNotContain("showBackButton", firstText, StringComparison.Ordinal);
        Assert.Contains("\"type\": \"OrganizationLookup\"", firstText, StringComparison.Ordinal);
        Assert.Contains("\"orgnr\": \"Party.OrgNumber\"", firstText, StringComparison.Ordinal);
        Assert.Contains("MANUAL_CONVERSION_REQUIRED", firstText, StringComparison.Ordinal);
        Assert.Contains("_conversionFailureInfo", firstText, StringComparison.Ordinal);
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "RuleConfiguration.json")));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "RuleHandler.js")));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "layout-sets.json")));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "Task_2")));
        Assert.Contains(
            first.Messages,
            message =>
                message.Status == UpgradeMessageStatus.Todo
                && message.Text.Contains("Task_1", StringComparison.Ordinal)
                && message.Text.Contains("legacy-rule", StringComparison.Ordinal)
                && message.Text.Contains("target", StringComparison.Ordinal)
        );

        _app.Write("App.csproj", _app.Read("App.csproj").Replace("8.8.0", "9.0.0", StringComparison.Ordinal));
        var second = await RunUpgrade();

        Assert.Equal(3, second.ExitCode);
        Assert.Equal(firstBytes, _app.ReadBytes(LayoutPath));
        Assert.DoesNotContain("not supported", second.Error, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(
            second.Messages,
            message =>
                message.Status == UpgradeMessageStatus.Todo
                && message.Text.Contains("MANUAL CONVERSION REQUIRED", StringComparison.Ordinal)
        );
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "RuleConfiguration.json")));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "RuleHandler.js")));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "layout-sets.json")));
    }

    [Fact]
    public async Task SuccessfulRuleConversionAndCleanupAreIdempotent()
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
        _app.Write(
            LayoutPath,
            """
            {
              "data": {
                "layout": [
                  { "id": "target", "type": "Input" }
                ]
              }
            }
            """
        );
        _app.Write(
            "ui/Task_1/RuleConfiguration.json",
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
            "ui/Task_1/RuleHandler.js",
            """
            var conditionalRuleHandlerObject = {
              hideWhenYes: function (obj) { return obj.value === "yes"; }
            };
            """
        );

        var first = await RunUpgrade();

        Assert.Equal(0, first.ExitCode);
        var firstLayout = _app.ReadBytes(LayoutPath);
        Assert.Equal(1, _app.Read(LayoutPath).Split("\"hidden\"", StringSplitOptions.None).Length - 1);
        Assert.False(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "RuleConfiguration.json")));
        Assert.False(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "RuleHandler.js")));

        _app.Write("App.csproj", _app.Read("App.csproj").Replace("8.8.0", "9.0.0", StringComparison.Ordinal));
        var second = await RunUpgrade();

        Assert.Equal(0, second.ExitCode);
        Assert.Equal(firstLayout, _app.ReadBytes(LayoutPath));
        Assert.DoesNotContain("not supported", second.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SuccessfulRuleConversionDoesNotDuplicateWhenLegacyFilesRemain()
    {
        _app.Write(
            LayoutPath,
            """
            { "data": { "layout": [{ "id": "target", "type": "Input" }] } }
            """
        );
        _app.Write(
            "ui/Task_1/RuleConfiguration.json",
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
            "ui/Task_1/RuleHandler.js",
            """
            var conditionalRuleHandlerObject = {
              hideWhenYes: function (obj) { return obj.value === "yes"; }
            };
            """
        );
        var workspace = await LayoutMigrationWorkspace.Load(_app.Root);
        Assert.NotNull(workspace);

        new ConditionalRenderingConverter(_app.Root, workspace).ConvertAllLayoutSets();
        new ConditionalRenderingConverter(_app.Root, workspace).ConvertAllLayoutSets();
        await workspace.Save();

        var root = JsonNode.Parse(_app.Read(LayoutPath));
        var hidden = root?["data"]?["layout"]?[0]?["hidden"]?.AsArray();
        Assert.NotNull(hidden);
        Assert.NotEqual("or", hidden[0]?.GetValue<string>());
        Assert.Equal(1, _app.Read(LayoutPath).Split("Model.Value", StringSplitOptions.None).Length - 1);
    }

    private async Task<UpgradeRun> RunUpgrade()
    {
        var report = new UpgradeReport();
        var error = new StringWriter();
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
                Error: error,
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );
        return new UpgradeRun(exitCode, report.Steps.SelectMany(step => step.Messages).ToList(), error.ToString());
    }

    private sealed record UpgradeRun(int ExitCode, IReadOnlyList<UpgradeMessage> Messages, string Error);
}
