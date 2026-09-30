using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;

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

    private static InMemoryAppDirectory SubformApp(string summaryFolder, string summary)
    {
        var task1Summary = summaryFolder == "Task_1" ? ", " + summary : "";
        var task2Summary = summaryFolder == "Task_2" ? summary : "";
        return new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/sum", "model", "sub"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{ "data": { "layout": [ { "id": "sf", "type": "Subform", "layoutSet": "sub-set" }"""
                    + task1Summary
                    + " ] } }",
                ["App/ui/sub-set/Settings.json"] = """{"pages":{"order":["S1"]},"defaultDataType":"sub"}""",
                ["App/ui/sub-set/layouts/S1.json"] =
                    """{ "data": { "layout": [ { "id": "brand", "type": "Input", "dataModelBindings": { "simpleBinding": "brand" } } ] } }""",
                ["App/ui/Task_2/Settings.json"] = """{"pages":{"order":["S"]},"defaultDataType":"model"}""",
                ["App/ui/Task_2/layouts/S.json"] = """{ "data": { "layout": [ """ + task2Summary + " ] } }",
            }
        );
    }

    private const string BrandOverride =
        """{ "id": "sum", "type": "Summary2", "overrides": [ { "componentId": "brand" } ] }""";

    [Fact]
    public void Override_OfASubformComponent_Resolves()
    {
        var report = AppConfigEngine.Open(SubformApp("Task_1", BrandOverride)).Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-UNMATCHED-COMPONENT-ID");
    }

    [Fact]
    public void Override_OfASubformComponentInTheTargetTask_Resolves()
    {
        var summary =
            """{ "id": "sum", "type": "Summary2", "target": { "type": "layoutSet", "taskId": "Task_1" }, "overrides": [ { "componentId": "brand" } ] }""";

        var report = AppConfigEngine.Open(SubformApp("Task_2", summary)).Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-UNMATCHED-COMPONENT-ID");
    }

    [Fact]
    public void Override_OfASubformComponentOfAnotherFolder_IsUnresolved()
    {
        var report = AppConfigEngine.Open(SubformApp("Task_2", BrandOverride)).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == "REF-UNMATCHED-COMPONENT-ID");
        Assert.Equal("/data/layout/0/overrides/0/componentId", finding.Position.Pointer);
    }

    [Fact]
    public void Override_OfASubformComponent_LinksToItsDeclaration()
    {
        var model = AppConfigEngine.Open(SubformApp("Task_1", BrandOverride)).Build();
        var overrideSite = new SourceSpan("App/ui/Task_1/layouts/P1.json", "/data/layout/1/overrides/0/componentId");
        var brand = Symbol.Component("brand", "sub-set");

        Assert.Equal(brand, model.SymbolTable.At(overrideSite.File, overrideSite.Pointer));
        Assert.Equal(
            new SourceSpan("App/ui/sub-set/layouts/S1.json", "/data/layout/0"),
            Assert.Single(model.SymbolTable.DeclarationsOf(brand))
        );
        Assert.Contains(overrideSite, model.SymbolTable.UsesOf(brand));
    }

    [Fact]
    public void Target_OfASubformComponent_IsStillUnresolved()
    {
        var summary = """{ "id": "sum", "type": "Summary2", "target": { "type": "component", "id": "brand" } }""";

        var report = AppConfigEngine.Open(SubformApp("Task_1", summary)).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == "REF-LAYOUT-COMPONENT-ID");
        Assert.Equal("/data/layout/1/target/id", finding.Position.Pointer);
    }
}
