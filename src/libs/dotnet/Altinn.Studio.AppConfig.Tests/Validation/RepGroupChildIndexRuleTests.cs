using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class RepGroupChildIndexRuleTests
{
    private const string Rule = "CROSS-REPGROUP-CHILD-INDEX";

    private static InMemoryAppDirectory App(string layout) =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/rg","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] = """
                {"properties":{"items":{"type":"array","items":{"type":"object","properties":{"subfield":{"type":"string"}}}},"shared":{"type":"string"}}}
                """,
            }
        );

    [Fact]
    public void IndexedBindingOnGroupArray_Fires()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """
                    { "data": { "layout": [
                      { "id": "rg", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" }, "children": ["c"] },
                      { "id": "c", "type": "Input", "dataModelBindings": { "simpleBinding": "items[0].subfield" } }
                    ] } }
                    """
                )
            )
            .Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains("items[0].subfield", finding.Message);
        Assert.Contains("bind \"items.subfield\"", finding.Message);
    }

    [Fact]
    public void IndexedBinding_OnNestedDescendant_Fires()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """
                    { "data": { "layout": [
                      { "id": "rg", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" }, "children": ["inner"] },
                      { "id": "inner", "type": "Group", "children": ["leaf"] },
                      { "id": "leaf", "type": "Input", "dataModelBindings": { "simpleBinding": "items[1].subfield" } }
                    ] } }
                    """
                )
            )
            .Validate();

        Assert.Single(report.Findings, f => f.RuleId == Rule);
    }

    [Fact]
    public void IndexFreeChild_AndOutsideGroupChild_AreClean()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """
                    { "data": { "layout": [
                      { "id": "rg", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" }, "children": ["under", "outside"] },
                      { "id": "under", "type": "Input", "dataModelBindings": { "simpleBinding": "items.subfield" } },
                      { "id": "outside", "type": "Input", "dataModelBindings": { "simpleBinding": "shared" } }
                    ] } }
                    """
                )
            )
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }

    [Fact]
    public void IndexedBinding_OnDifferentDataType_IsSkipped()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """
                    { "data": { "layout": [
                      { "id": "rg", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" }, "children": ["c"] },
                      { "id": "c", "type": "Input", "dataModelBindings": { "simpleBinding": { "field": "items[0].subfield", "dataType": "other" } } }
                    ] } }
                    """
                )
            )
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }

    [Fact]
    public void SiblingArrayWithSharedPrefix_IsClean()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """
                    { "data": { "layout": [
                      { "id": "rg", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" }, "children": ["c"] },
                      { "id": "c", "type": "Input", "dataModelBindings": { "simpleBinding": "itemsArchive[0].subfield" } }
                    ] } }
                    """
                )
            )
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }
}
