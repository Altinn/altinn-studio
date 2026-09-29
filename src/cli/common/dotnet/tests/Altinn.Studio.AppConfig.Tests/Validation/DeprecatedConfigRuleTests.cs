using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class DeprecatedConfigRuleTests
{
    private const string Rule = "DEPRECATED-CONFIG";

    private static InMemoryAppDirectory App(string metadata, string component) =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = metadata,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                ["App/ui/Task_1/layouts/P1.json"] = $$"""{ "data": { "layout": [ {{component}} ] } }""",
            }
        );

    private const string CleanComponent =
        """{ "id": "in", "type": "Input", "dataModelBindings": { "simpleBinding": "f" } }""";

    [Fact]
    public void EnablePdfCreation_IsReportedAtTheProperty()
    {
        var metadata = """
            {"id":"ttd/x","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1","enablePdfCreation":true}]}
            """;
        var report = AppConfigEngine.Open(App(metadata, CleanComponent)).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains("enablePdfCreation", finding.Message);
        Assert.Equal("/dataTypes/0/enablePdfCreation", finding.Position.Pointer);
    }

    [Fact]
    public void LegacyEFormidlingBlock_IsReportedInsteadOfResolved()
    {
        var metadata = """
            {"id":"ttd/x","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"}],"eFormidling":{"sendAfterTaskId":"Task_gone","dataTypes":["gone"]}}
            """;
        var report = AppConfigEngine.Open(App(metadata, CleanComponent)).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Equal("/eFormidling", finding.Position.Pointer);
        Assert.DoesNotContain(report.Findings, f => f.Message.Contains("Task_gone") || f.Message.Contains("\"gone\""));
    }

    [Theory]
    [InlineData("Dropdown")]
    [InlineData("FileUpload")]
    public void MappingOnOptionsComponent_IsReported(string type)
    {
        var component =
            $$"""{ "id": "c", "type": "{{type}}", "optionsId": "o", "mapping": { "f": "q" }, "dataModelBindings": { "simpleBinding": "f" } }""";
        var report = AppConfigEngine.Open(App(TestMeta.Json("ttd/x", "model"), component)).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Equal("/data/layout/0/mapping", finding.Position.Pointer);
    }

    [Fact]
    public void MappingOnButton_IsStillSupported()
    {
        var component = """{ "id": "b", "type": "InstantiationButton", "mapping": { "f": "q" } }""";
        var report = AppConfigEngine.Open(App(TestMeta.Json("ttd/x", "model"), component)).Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }

    [Fact]
    public void BindingToShowInSummaryOnList_IsReported()
    {
        var component =
            """{ "id": "l", "type": "List", "optionsId": "o", "bindingToShowInSummary": "f", "dataModelBindings": { "simpleBinding": "f" } }""";
        var report = AppConfigEngine.Open(App(TestMeta.Json("ttd/x", "model"), component)).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains("summaryBinding", finding.Message);
    }

    [Fact]
    public void Baseline_HasNoDeprecatedConfig()
    {
        var report = AppConfigEngine.Open(BaselineApp.Load()).Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }
}
