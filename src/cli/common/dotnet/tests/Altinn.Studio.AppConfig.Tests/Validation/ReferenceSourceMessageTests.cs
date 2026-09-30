using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class ReferenceSourceMessageTests
{
    private static IReadOnlyList<Finding> Findings(params (string Path, string Content)[] extra)
    {
        var files = new Dictionary<string, string>
        {
            ["App/config/applicationmetadata.json"] =
                """{"id":"ttd/src","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model"}],"dataFields":[{"id":"f","path":"nope","dataTypeId":"model"}]}""",
            ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
            ["App/ui/Task_1/layouts/P1.json"] =
                """{"data":{"hidden":["equals",["component","ghost"],"x"],"layout":[{"id":"s","type":"Summary","componentRef":"missing"}]}}""",
            ["App/ui/footer.json"] = """{"footer":[{"type":"Text","title":"footer.key"}]}""",
            ["App/models/model.schema.json"] = """{"properties":{"real":{"type":"string"}}}""",
        };
        foreach (var (path, content) in extra)
            files[path] = content;
        return ValidationEngine.Run(AppConfigEngine.Open(new InMemoryAppDirectory(files)).Build()).Findings;
    }

    [Fact]
    public void ComponentReference_WithoutOwningComponent_LeavesOutReferencedFrom()
    {
        var finding = Assert.Single(
            Findings(),
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("\"ghost\"", StringComparison.Ordinal)
        );

        Assert.Equal("component \"ghost\" does not exist in layout-set \"Task_1\"", finding.Message);
    }

    [Fact]
    public void ExcludeFromPdfEntry_LeavesOutReferencedFrom()
    {
        var finding = Assert.Single(
            Findings(
                (
                    "App/ui/Task_1/Settings.json",
                    """{"pages":{"order":["P1"]},"defaultDataType":"model","components":{"excludeFromPdf":["gone"]}}"""
                )
            ),
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("\"gone\"", StringComparison.Ordinal)
        );

        Assert.Equal("component \"gone\" does not exist in layout-set \"Task_1\"", finding.Message);
        Assert.Equal("/components/excludeFromPdf/0", finding.Position.Pointer);
    }

    [Fact]
    public void ComponentReference_FromAComponent_NamesIt()
    {
        var finding = Assert.Single(
            Findings(),
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("\"missing\"", StringComparison.Ordinal)
        );

        Assert.Equal(
            "component \"missing\" does not exist in layout-set \"Task_1\" (referenced from \"s\")",
            finding.Message
        );
    }

    [Fact]
    public void DataModelPath_OutsideAComponent_NamesOnlyTheSetting()
    {
        var finding = Assert.Single(Findings(), f => f.RuleId == "REF-DATAMODEL-PATH");

        Assert.Equal(
            "data-model binding \"nope\" (dataFields) is not declared in dataType \"model\"'s schema "
                + "(App/models/model.schema.json)",
            finding.Message
        );
    }

    [Fact]
    public void TextResourceKey_OutsideAComponent_NamesOnlyTheSetting()
    {
        var finding = Assert.Single(Findings(), f => f.RuleId == "REF-TEXT-RESOURCE-KEY");

        Assert.Equal(
            "text-resource key \"footer.key\" (footer title) is not declared in any resource.<lang>.json",
            finding.Message
        );
    }
}
