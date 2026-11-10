using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ComponentIdMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Theory]
    [InlineData("Summary_form", "Summary-form")]
    [InlineData("S50_Summary_S01", "S50-Summary-S01")]
    [InlineData("HeaderSpm01-1", "HeaderSpm011")]
    [InlineData("Oppsummering-s2-1", "Oppsummering-s21")]
    [InlineData("Header_1", "Header1")]
    [InlineData("a-1-2", "a12-id")]
    [InlineData("Alert-IngenÅpneTilsyn", "Alert-IngenAapneTilsyn")]
    [InlineData("Input-Lokalitet-Søk", "Input-Lokalitet-Sok")]
    [InlineData("19.side.sluttside.overskrift", "19-side-sluttside-overskrift")]
    [InlineData("5- -Header", "5-Header")]
    [InlineData("_12_", "12-id")]
    public void ValidIdFor_ReturnsAnIdTheV9SchemaAccepts(string id, string expected)
    {
        var validId = ComponentIdMigration.ValidIdFor(id);

        Assert.Equal(expected, validId);
        Assert.True(ComponentIdMigration.IsValidId(expected));
    }

    [Theory]
    [InlineData("Input-adsi95")]
    [InlineData("7a2bc5f3-1b2c-4d5e-8f90-123456")]
    [InlineData("name")]
    [InlineData("field-a")]
    public void ValidIdFor_LeavesValidIdsAlone(string id) => Assert.Null(ComponentIdMigration.ValidIdFor(id));

    [Fact]
    public async Task RenamesInvalidIdsAndTheirReferencesInTheSameFolder()
    {
        _app.Write(
            "ui/form/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "group_1",
                    "type": "RepeatingGroup",
                    "children": ["name_input", "age-1"],
                    "tableHeaders": ["name_input"],
                    "tableColumns": { "name_input": { "width": "50%" } }
                  },
                  { "id": "name_input", "type": "Input", "hidden": ["equals", ["component", "age-1"], 1] },
                  { "id": "age-1", "type": "Input", "textResourceBindings": { "title": "name_input" } },
                  {
                    "id": "grid",
                    "type": "Grid",
                    "rows": [{ "cells": [{ "component": "name_input" }, { "text": "name_input" }] }]
                  }
                ]
              }
            }
            """
        );
        _app.Write(
            "ui/form/layouts/Side2.json",
            """
            {
              "data": {
                "layout": [
                  { "id": "summary", "type": "Summary", "componentRef": "name_input" },
                  { "id": "summary2", "type": "Summary2", "target": { "id": "group_1" } },
                  { "id": "page-summary", "type": "Summary2", "target": { "type": "page", "id": "group_1" } },
                  { "id": "paragraph", "type": "Paragraph", "textResourceBindings": { "title": ["displayValue", "name_input"] } }
                ]
              }
            }
            """
        );
        _app.Write(
            "ui/form/Settings.json",
            """
            {
              "pages": { "order": ["Side1", "Side2"] },
              "components": { "excludeFromPdf": ["name_input"] }
            }
            """
        );

        var result = await ComponentIdMigration.Migrate(_app.Root);

        Assert.False(result.RequiresManualFollowUp);
        var side1 = Layout("ui/form/layouts/Side1.json");
        Assert.Equal("group1", TextAt(side1, 0, "id"));
        Assert.Equal(["name-input", "age1"], Texts(side1, 0, "children"));
        Assert.Equal(["name-input"], Texts(side1, 0, "tableHeaders"));
        Assert.IsType<JsonObject>(At(side1, 0, "tableColumns", "name-input"));
        Assert.Equal("name-input", TextAt(side1, 1, "id"));
        Assert.Equal("age1", TextAt(side1, 1, "hidden", 1, 1));
        Assert.Equal("age1", TextAt(side1, 2, "id"));
        Assert.Equal("name_input", TextAt(side1, 2, "textResourceBindings", "title"));
        Assert.Equal("name-input", TextAt(side1, 3, "rows", 0, "cells", 0, "component"));
        Assert.Equal("name_input", TextAt(side1, 3, "rows", 0, "cells", 1, "text"));

        var side2 = Layout("ui/form/layouts/Side2.json");
        Assert.Equal("name-input", TextAt(side2, 0, "componentRef"));
        Assert.Equal("group1", TextAt(side2, 1, "target", "id"));
        Assert.Equal("group_1", TextAt(side2, 2, "target", "id"));
        Assert.Equal("name-input", TextAt(side2, 3, "textResourceBindings", "title", 1));

        var settings = JsonNode.Parse(_app.Read("ui/form/Settings.json"));
        Assert.Equal(["name-input"], Texts(settings, "components", "excludeFromPdf"));
    }

    [Fact]
    public async Task GivesANewIdThatIsTakenASuffix()
    {
        _app.Write(
            "ui/form/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  { "id": "name-input", "type": "Input" },
                  { "id": "name_input", "type": "Input" }
                ]
              }
            }
            """
        );

        await ComponentIdMigration.Migrate(_app.Root);

        var layout = Layout("ui/form/layouts/Side1.json");
        Assert.Equal("name-input", TextAt(layout, 0, "id"));
        Assert.Equal("name-input-b", TextAt(layout, 1, "id"));
    }

    [Fact]
    public async Task RenamesASummary2TargetInAnotherTasksFolder()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """{ "data": { "layout": [{ "id": "name_input", "type": "Input" }] } }"""
        );
        _app.Write(
            "ui/Task_2/layouts/Pdf.json",
            """
            {
              "data": {
                "layout": [
                  { "id": "summary", "type": "Summary2", "target": { "type": "component", "id": "name_input", "taskId": "Task_1" } }
                ]
              }
            }
            """
        );

        await ComponentIdMigration.Migrate(_app.Root);

        Assert.Equal("name-input", TextAt(Layout("ui/Task_2/layouts/Pdf.json"), 0, "target", "id"));
    }

    [Fact]
    public async Task ReportsCodeThatNamesARenamedId()
    {
        _app.Write(
            "ui/form/layouts/Side1.json",
            """{ "data": { "layout": [{ "id": "name_input", "type": "Input" }] } }"""
        );
        _app.Write(
            "logic/Validator.cs",
            """
            class Validator
            {
                const string Field = "name_input";
            }
            """
        );

        var result = await ComponentIdMigration.Migrate(_app.Root);

        var todo = Assert.Single(result.Todos);
        Assert.Contains("App/logic/Validator.cs", todo, StringComparison.Ordinal);
        Assert.Contains("name_input", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesAFolderWithAnUnreadableLayoutAlone()
    {
        _app.Write(
            "ui/form/layouts/Side1.json",
            """{ "data": { "layout": [{ "id": "name_input", "type": "Input" }] } }"""
        );
        _app.Write("ui/form/layouts/Side2.json", "{ not json");

        var result = await ComponentIdMigration.Migrate(_app.Root);

        Assert.Single(result.Todos);
        Assert.Equal("name_input", TextAt(Layout("ui/form/layouts/Side1.json"), 0, "id"));
    }

    [Fact]
    public async Task ReportsNothingWhenEveryIdIsValid()
    {
        _app.Write(
            "ui/form/layouts/Side1.json",
            """{ "data": { "layout": [{ "id": "Input-adsi95", "type": "Input" }] } }"""
        );

        var result = await ComponentIdMigration.Migrate(_app.Root);

        Assert.Empty(result.Messages);
    }

    private JsonNode? Layout(string path) => At(JsonNode.Parse(_app.Read(path)), "data", "layout");

    private static JsonNode? At(JsonNode? node, params object[] path)
    {
        foreach (var step in path)
        {
            node = step switch
            {
                int index when node is JsonArray array && index < array.Count => array[index],
                string name when node is JsonObject obj => obj[name],
                _ => null,
            };
        }

        return node;
    }

    private static string? TextAt(JsonNode? node, params object[] path) =>
        At(node, path) is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    private static IEnumerable<string?> Texts(JsonNode? node, params object[] path) =>
        Assert.IsType<JsonArray>(At(node, path)).Select(item => TextAt(item));
}
