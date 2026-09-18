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
                    // Keep the app developer's explanation: æøå
                    "layout": [
                      { "id": "target", "type": "Header" },
                      { "id": "navigation", "type": "NavigationButtons", "showBackButton": true },
                      { "id": "organization", "type": "OrganisationLookup", "dataModelBindings": { "organisation_lookup_orgnr": "Party.OrgNumber" } },
                      { "id": "payment", "type": "PaymentDetails", "mapping": { "Order.Total": "total" } },
                      { "id": "start", "type": "Button", "mode": "instantiate", "mapping": { "Party.Name": "name" } }
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
        Assert.Contains("// Keep the app developer's explanation: æøå", firstText);
        Assert.Contains("\"refetchDependencies\"", firstText);
        Assert.Contains("\"queryParameters\"", firstText);
        Assert.Contains("\"type\": \"InstantiationButton\"", firstText);
        Assert.DoesNotContain("\"mapping\"", firstText);
        Assert.DoesNotContain("\"mode\"", firstText);
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

    [Theory]
    [InlineData("instantiate", "InstantiationButton")]
    [InlineData("submit", "Button")]
    [InlineData("save", "Button")]
    public async Task ButtonOnlyChangesAreReportedAsApplied(string mode, string expectedType)
    {
        WriteV9Project();
        _app.Write(LayoutPath, $$$"""{"data":{"layout":[{"id":"button","type":"Button","mode":"{{{mode}}}"}]}}""");

        var first = await RunUpgrade();

        Assert.Equal(0, first.ExitCode);
        Assert.Contains(
            first.Messages,
            message => message.Status == UpgradeMessageStatus.Ok && message.Text.Contains("Applied v9 layout changes")
        );
        Assert.DoesNotContain(first.Messages, message => message.Text == "No v9 layout changes found");
        Assert.Equal(
            expectedType,
            JsonNode.Parse(_app.Read(LayoutPath))?["data"]?["layout"]?[0]?["type"]?.GetValue<string>()
        );
        var firstBytes = _app.ReadBytes(LayoutPath);
        var second = await RunUpgrade();
        Assert.Equal(0, second.ExitCode);
        Assert.Equal(firstBytes, _app.ReadBytes(LayoutPath));
        Assert.Contains(
            second.Messages,
            message => message.Status == UpgradeMessageStatus.Skip && message.Text == "No v9 layout changes found"
        );
    }

    [Fact]
    public async Task NewMainJobsShareThePipelineAndRemainStableOnV9Rerun()
    {
        WriteV9Project();
        _app.Write("App.csproj", _app.Read("App.csproj").Replace("9.0.0", "8.8.0", StringComparison.Ordinal));
        var layout =
            """
                { "data": { "layout": [
                  // New main migrations must retain this comment: æøå
                  { "id": "payment", "type": "PaymentDetails", "mapping": { "Order.Total": "total" } },
                  { "id": "start", "type": "Button", "mode": "instantiate", "mapping": { "Party.Name": "name" } },
                  { "id": "upload", "type": "FileUploadWithTag", "mapping": { "Party.Kind": "kind" } }
                ] } }
                """.ReplaceLineEndings("\r\n") + "\r\n";
        _app.WriteBytes(LayoutPath, Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(layout)).ToArray());
        _app.Write(
            "logic/OrderCalculator.cs",
            """
            using System;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features.Payment;
            using Altinn.App.Core.Features.Payment.Models;
            using Altinn.Platform.Storage.Interface.Models;
            public class OrderCalculator : IOrderDetailsCalculator
            {
                public Task<OrderDetails> CalculateOrderDetails(Instance instance, string language) => throw new NotImplementedException();
            }
            """
        );
        _app.Write(
            "logic/Texts.cs",
            """
            using Altinn.App.Core.Internal.Texts;
            public class Texts
            {
                private IText _texts;
                public object Read() => _texts.GetText("org", "app", "nb");
            }
            """
        );
        _app.CommitEverything();

        var first = await RunUpgrade();

        Assert.Equal(0, first.ExitCode);
        var firstLayout = _app.ReadBytes(LayoutPath);
        Assert.True(firstLayout.AsSpan().StartsWith(Encoding.UTF8.GetPreamble()));
        var text = Encoding.UTF8.GetString(firstLayout);
        Assert.Contains("// New main migrations must retain this comment: æøå", text);
        Assert.EndsWith("\r\n", text);
        Assert.DoesNotContain("\n", text.Replace("\r\n", "", StringComparison.Ordinal));
        var components = JsonNode
            .Parse(
                text.TrimStart('\uFEFF'),
                documentOptions: new System.Text.Json.JsonDocumentOptions
                {
                    CommentHandling = System.Text.Json.JsonCommentHandling.Skip,
                }
            )
            ?["data"]?["layout"];
        Assert.NotNull(components);
        Assert.Equal("Order.Total", components[0]?["refetchDependencies"]?["total"]?[1]?.GetValue<string>());
        Assert.Equal("InstantiationButton", components[1]?["type"]?.GetValue<string>());
        Assert.Equal("Party.Name", components[1]?["queryParameters"]?["name"]?[1]?.GetValue<string>());
        Assert.Equal("FileUpload", components[2]?["type"]?.GetValue<string>());
        Assert.Equal("Party.Kind", components[2]?["queryParameters"]?["kind"]?[1]?.GetValue<string>());
        var calculator = _app.Read("logic/OrderCalculator.cs");
        var texts = _app.Read("logic/Texts.cs");
        Assert.Contains("CancellationToken cancellationToken", calculator);
        Assert.Contains("IAppResources", texts);
        Assert.Contains("GetTexts", texts);

        _app.Write("App.csproj", _app.Read("App.csproj").Replace("8.8.0", "9.0.0", StringComparison.Ordinal));
        var second = await RunUpgrade();

        Assert.Equal(0, second.ExitCode);
        Assert.Equal(firstLayout, _app.ReadBytes(LayoutPath));
        Assert.Equal(calculator, _app.Read("logic/OrderCalculator.cs"));
        Assert.Equal(texts, _app.Read("logic/Texts.cs"));
    }

    [Theory]
    [InlineData("PersonLookup", "person_lookup_ssn", "ssn")]
    [InlineData("OrganisationLookup", "organisation_lookup_orgnr", "organization_lookup_orgnr")]
    public async Task BindingConflictDoesNotBlockOtherLayoutChanges(string type, string oldKey, string newKey)
    {
        WriteV9Project();
        _app.Write(
            LayoutPath,
            $$"""
            { "data": { "layout": [
              { "id": "conflict", "type": "{{type}}", "dataModelBindings": { "{{oldKey}}": "Old", "{{newKey}}": "New" } },
              { "id": "heading", "type": "Header" }
            ] } }
            """
        );

        var result = await RunUpgrade();

        Assert.Equal(3, result.ExitCode);
        Assert.Contains("Heading", _app.Read(LayoutPath));
        Assert.Contains("Old", _app.Read(LayoutPath));
        Assert.Contains("New", _app.Read(LayoutPath));
        Assert.Contains(
            result.Messages,
            message => message.Status == UpgradeMessageStatus.Todo && message.Text.Contains(oldKey)
        );
        var first = _app.Read(LayoutPath);
        var repeated = await RunUpgrade();
        Assert.Equal(3, repeated.ExitCode);
        Assert.Equal(first, _app.Read(LayoutPath));
    }

    [Fact]
    public async Task CommentedLayoutMigratesAndIsStableOnRepeatedRuns()
    {
        WriteV9Project();
        const string layout =
            "{ /* Keep this explanation */ \"data\": { \"layout\": [{ \"id\": \"heading\", \"type\": \"Header\" }] } }";
        _app.Write(LayoutPath, layout);
        _app.Write("ui/Task_1/RuleConfiguration.json", "{}");
        _app.Write("ui/Task_1/RuleHandler.js", "// Legacy source");

        string? first = null;
        for (var run = 0; run < 2; run++)
        {
            var result = await RunUpgrade();
            Assert.Equal(0, result.ExitCode);
            var after = _app.Read(LayoutPath);
            Assert.Contains("/* Keep this explanation */", after);
            Assert.Contains("Heading", after);
            if (first is not null)
                Assert.Equal(first, after);
            first = after;
        }
    }

    [Theory]
    [InlineData(
        """{"id":"lookup","type":"PersonLookup","dataModelBindings":{"person_lookup_ssn":"Old","ssn":"New"}}"""
    )]
    [InlineData("""{"id":"options","type":"Dropdown","mapping":{"Old":"key"},"queryParameters":{"key":"New"}}""")]
    public async Task LayoutTodosPreserveLegacySourcesAndFoldersUntilResolved(string component)
    {
        WriteV9Project();
        _app.Write(LayoutPath, "{\"data\":{\"layout\":[" + component + "]}}");
        _app.Write("ui/Task_1/RuleConfiguration.json", "{}");
        _app.Write("ui/Task_1/RuleHandler.js", "// Keep until manual work is complete");
        _app.Write("ui/layout-sets.json", """{"sets":[{"id":"Task_1","tasks":["Task_2"],"dataType":"Main"}]}""");

        for (var run = 0; run < 2; run++)
        {
            var result = await RunUpgrade();
            Assert.Equal(3, result.ExitCode);
            Assert.Equal("{}", _app.Read("ui/Task_1/RuleConfiguration.json"));
            Assert.Equal("// Keep until manual work is complete", _app.Read("ui/Task_1/RuleHandler.js"));
            Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "layout-sets.json")));
            Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "Task_2")));
        }
    }

    [Fact]
    public async Task FailedLayoutMigrationPreservesAllLegacySources()
    {
        WriteV9Project();
        _app.Write(LayoutPath, "null");
        _app.Write("ui/Task_1/RuleConfiguration.json", "{}");
        _app.Write("ui/Task_1/RuleHandler.js", "// Legacy source");
        _app.Write("ui/layout-sets.json", "{\"sets\":[{\"id\":\"Task_1\",\"tasks\":[\"Task_2\"]}]}");

        var result = await RunUpgrade();

        Assert.Equal(1, result.ExitCode);
        Assert.Equal("{}", _app.Read("ui/Task_1/RuleConfiguration.json"));
        Assert.Equal("// Legacy source", _app.Read("ui/Task_1/RuleHandler.js"));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "Task_2")));
        Assert.Contains(
            result.Messages,
            message => message.Status == UpgradeMessageStatus.Todo && message.Text.Contains("Kept all legacy")
        );
    }

    private void WriteV9Project() =>
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>
              <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
              <PackageReference Include="Altinn.App.Core" Version="9.0.0" />
            </ItemGroup></Project>
            """
        );
}
