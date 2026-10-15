using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class HiddenDataRemovalAdvisorTests : IDisposable
{
    private const string LayoutPath = "ui/form/layouts/Page1.json";
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Analyze() =>
        new HiddenDataRemovalAdvisor(_app.Root, Path.Combine(_app.Root, "App")).Analyze();

    private void WriteLayout(string components, string pageProperties = "", string path = LayoutPath) =>
        _app.Write(path, $$"""{ "data": { {{pageProperties}} "layout": [ {{components}} ] } }""");

    [Fact]
    public async Task HiddenExpressionOnBoundComponent_Warns()
    {
        WriteLayout(
            """
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" },
              "hidden": ["equals", ["dataModel", "Model.Show"], false] },
            { "id": "visible", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Other" } }
            """
        );

        var result = await Analyze();

        var warning = Assert.Single(result.Warnings);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains("1 hidden component(s) or page(s) bind data", warning, StringComparison.Ordinal);
        Assert.Contains($"{Path.Combine("App", "ui", "form", "layouts", "Page1.json")}: name", warning);
        Assert.DoesNotContain("visible", warning, StringComparison.Ordinal);
        Assert.Contains("\"AppSettings\": { \"RemoveHiddenData\": false }", warning, StringComparison.Ordinal);
        Assert.Contains("\"removeWhenHidden\": false", warning, StringComparison.Ordinal);
        Assert.Contains("whoever receives the data", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task HiddenPageWithBoundComponent_Warns()
    {
        WriteLayout(
            """{ "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" } }""",
            pageProperties: """ "hidden": ["equals", ["dataModel", "Model.Show"], false], """
        );

        var warning = Assert.Single((await Analyze()).Warnings);

        Assert.Contains("Page1.json (hidden page)", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task HiddenPageWithoutBoundComponents_IsSilent()
    {
        WriteLayout("""{ "id": "info", "type": "Paragraph" }""", pageProperties: """ "hidden": true, """);

        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task HiddenRow_Warns()
    {
        WriteLayout(
            """
            { "id": "people", "type": "RepeatingGroup", "children": ["person"],
              "dataModelBindings": { "group": "Model.People" },
              "hiddenRow": ["equals", ["dataModel", "Model.People.Active"], false] },
            { "id": "person", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.People.Name" } }
            """
        );

        var warning = Assert.Single((await Analyze()).Warnings);

        Assert.Contains("Page1.json: people (hidden rows)", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task HiddenContainerWithBoundChild_Warns()
    {
        WriteLayout(
            """
            { "id": "section", "type": "Group", "children": ["name"], "hidden": true },
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" } }
            """
        );

        var warning = Assert.Single((await Analyze()).Warnings);

        Assert.Contains("Page1.json: section", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemoveWhenHiddenFalseOnTheOnlyHiddenComponent_IsSilent()
    {
        WriteLayout(
            """
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" },
              "hidden": true, "removeWhenHidden": false }
            """
        );

        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task HiddenContainerWhoseBoundChildKeepsItsData_IsSilent()
    {
        WriteLayout(
            """
            { "id": "section", "type": "Group", "children": ["name"], "hidden": true },
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" },
              "removeWhenHidden": false }
            """
        );

        Assert.Empty((await Analyze()).Messages);
    }

    [Theory]
    [InlineData("true")]
    [InlineData("false")]
    public async Task RemoveHiddenDataSetInAppSettings_IsSilent(string value)
    {
        WriteLayout(
            """
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" }, "hidden": true }
            """
        );
        _app.Write("appsettings.json", """{ "AppSettings": { "AppOidcProvider": "altinn" } }""");
        _app.Write("appsettings.Production.json", $$"""{ "appSettings": { "removeHiddenData": {{value}} } }""");

        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task NoHideableData_IsSilent()
    {
        WriteLayout(
            """
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" }, "hidden": false },
            { "id": "info", "type": "Paragraph", "hidden": true },
            { "id": "people", "type": "RepeatingGroup", "dataModelBindings": { "group": "Model.People" },
              "hiddenRow": false }
            """
        );
        _app.Write("appsettings.json", """{ "AppSettings": { "AppOidcProvider": "altinn" } }""");

        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task ManyAffectedComponents_ListsFiveAndTheTotal()
    {
        var components = Enumerable
            .Range(1, 7)
            .Select(i =>
                $$"""{ "id": "field{{i}}", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.F{{i}}" }, "hidden": true }"""
            );
        WriteLayout(string.Join(",", components));

        var warning = Assert.Single((await Analyze()).Warnings);

        Assert.Contains("7 hidden component(s) or page(s) bind data", warning, StringComparison.Ordinal);
        Assert.Contains("Page1.json: field5 and 2 more.", warning, StringComparison.Ordinal);
        Assert.DoesNotContain("field6", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReadsV9UiFolders()
    {
        WriteLayout(
            """
            { "id": "name", "type": "Input", "dataModelBindings": { "simpleBinding": "Model.Name" }, "hidden": true }
            """,
            path: "ui/Task_1/layouts/Page1.json"
        );

        var warning = Assert.Single((await Analyze()).Warnings);

        Assert.Contains($"{Path.Combine("App", "ui", "Task_1", "layouts", "Page1.json")}: name", warning);
    }
}
