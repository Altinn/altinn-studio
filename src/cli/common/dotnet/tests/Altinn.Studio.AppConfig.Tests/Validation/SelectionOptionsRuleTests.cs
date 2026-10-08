using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class SelectionOptionsRuleTests
{
    private const string Rule = "SELECTION-OPTIONS";

    private static InMemoryAppDirectory App(string component) =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/sel", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                ["App/ui/Task_1/layouts/P1.json"] = $$"""{ "data": { "layout": [ {{component}} ] } }""",
            }
        );

    [Theory]
    [InlineData("List")]
    [InlineData("Option")]
    [InlineData("LikertItem")]
    public void V9OptionsBearingComponent_WithoutSource_Fires(string type)
    {
        var report = AppConfigEngine
            .Open(App($$"""{ "id": "c", "type": "{{type}}", "dataModelBindings": { "simpleBinding": "field" } }"""))
            .Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains(type, finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Dropdown_WithOptionsId_IsClean()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """{ "id": "c", "type": "Dropdown", "optionsId": "countries", "dataModelBindings": { "simpleBinding": "field" } }"""
                )
            )
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }

    [Fact]
    public void List_WithDataListId_IsClean()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """{ "id": "c", "type": "List", "dataListId": "people", "dataModelBindings": { "name": "field" } }"""
                )
            )
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }

    [Fact]
    public void List_WithOnlyOptionsId_Fires()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """{ "id": "c", "type": "List", "optionsId": "countries", "dataModelBindings": { "name": "field" } }"""
                )
            )
            .Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains("dataListId", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Dropdown_WithOnlyDataListId_Fires()
    {
        var report = AppConfigEngine
            .Open(
                App(
                    """{ "id": "c", "type": "Dropdown", "dataListId": "people", "dataModelBindings": { "simpleBinding": "field" } }"""
                )
            )
            .Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains("optionsId", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void FileUpload_WithoutOptions_IsClean()
    {
        var report = AppConfigEngine
            .Open(App("""{ "id": "c", "type": "FileUpload", "dataModelBindings": { "list": "attachments" } }"""))
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }
}
