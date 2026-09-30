using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class Summary2TargetTests
{
    private static InMemoryAppDirectory App(string target) =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/sum", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{ "data": { "layout": [ { "id": "in", "type": "Input", "dataModelBindings": { "simpleBinding": "f" } } ] } }""",
                ["App/ui/Task_2/Settings.json"] = """{"pages":{"order":["S"]},"defaultDataType":"model"}""",
                ["App/ui/Task_2/layouts/S.json"] =
                    $$"""{ "data": { "layout": [ { "id": "sum", "type": "Summary2", "target": {{target}} } ] } }""",
            }
        );

    [Fact]
    public void LayoutSetTarget_MissingSet_IsUnresolved()
    {
        var report = AppConfigEngine.Open(App("""{ "type": "layoutSet", "id": "Nope" }""")).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == "REF-LAYOUT-SET");
        Assert.Contains("Nope", finding.Message, StringComparison.Ordinal);
        Assert.Equal("/data/layout/0/target/id", finding.Position.Pointer);
    }

    [Fact]
    public void LayoutSetTarget_ExistingSet_IsClean()
    {
        var report = AppConfigEngine.Open(App("""{ "type": "layoutSet", "id": "Task_1" }""")).Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-LAYOUT-SET");
    }
}
