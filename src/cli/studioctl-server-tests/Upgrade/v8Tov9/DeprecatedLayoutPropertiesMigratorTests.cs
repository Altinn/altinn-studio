using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9.DeprecatedLayoutPropertiesMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class DeprecatedLayoutPropertiesMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<DeprecatedLayoutPropertiesMigrationResult> Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        return await new DeprecatedLayoutPropertiesMigrator(_app.Root).Migrate();
    }

    /// <summary>Reads the component at <paramref name="index"/> in a written layout file.</summary>
    private JsonObject Component(string relativePath, int index)
    {
        var json = _app.Read(relativePath);
        if (
            JsonNode.Parse(json) is not JsonObject root
            || root["data"] is not JsonObject data
            || data["layout"] is not JsonArray layout
            || layout[index] is not JsonObject component
        )
        {
            throw new JsonException($"{relativePath} does not hold a component at index {index}");
        }

        return component;
    }

    /// <summary>The text value at <paramref name="node"/>, or null when it holds something else.</summary>
    private static string? Text(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    /// <summary>The node serialized without indentation, so tests can compare it to a literal.</summary>
    private static string? Compact(JsonNode? node) => node?.ToJsonString();

    [Fact]
    public async Task ConvertsMappingToQueryParametersOnOptionComponents()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "colors",
                    "type": "Dropdown",
                    "optionsId": "colors",
                    "dataModelBindings": { "simpleBinding": "Color" },
                    "mapping": { "Animals.IsForeign": "foreign" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(1, result.QueryParametersConverted);
        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);

        var component = Component("ui/Task_1/layouts/Side1.json", 0);
        Assert.False(component.ContainsKey("mapping"));
        Assert.Equal("""["dataModel","Animals.IsForeign"]""", Compact(component["queryParameters"]?["foreign"]));
    }

    [Fact]
    public async Task ConvertsMappingOnATaggedFileUploadWhicheverNameItStillCarries()
    {
        // FileUploadWithTagLayoutMigration runs earlier in the v8-to-v9 pipeline and renames the
        // component to FileUpload, so by the time this migration sees the layout the mapping can sit
        // under either name. Both have to convert.
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "renamed",
                    "type": "FileUpload",
                    "optionsId": "tags",
                    "mapping": { "Animals.IsForeign": "foreign" }
                  },
                  {
                    "id": "not-renamed",
                    "type": "FileUploadWithTag",
                    "optionsId": "tags",
                    "mapping": { "Animals.IsDomestic": "domestic" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(2, result.QueryParametersConverted);
        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);

        var renamed = Component("ui/Task_1/layouts/Side1.json", 0);
        Assert.False(renamed.ContainsKey("mapping"));
        Assert.Equal("""["dataModel","Animals.IsForeign"]""", Compact(renamed["queryParameters"]?["foreign"]));

        var notRenamed = Component("ui/Task_1/layouts/Side1.json", 1);
        Assert.False(notRenamed.ContainsKey("mapping"));
        Assert.Equal("""["dataModel","Animals.IsDomestic"]""", Compact(notRenamed["queryParameters"]?["domestic"]));
    }

    [Fact]
    public async Task DropsRepeatingGroupRowMarkersFromTheDataModelPath()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "reference",
                    "type": "RadioButtons",
                    "optionsId": "references",
                    "mapping": { "Group[{0}].Nested[{1}].source": "source" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.QueryParametersConverted);
        var component = Component("ui/Task_1/layouts/Side1.json", 0);
        Assert.Equal("""["dataModel","Group.Nested.source"]""", Compact(component["queryParameters"]?["source"]));
    }

    [Fact]
    public async Task MergesMappingIntoQueryParametersAlreadyConfigured()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "colors",
                    "type": "Checkboxes",
                    "optionsId": "colors",
                    "mapping": { "Animals.IsForeign": "foreign" },
                    "queryParameters": { "region": "asia" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.QueryParametersConverted);
        var queryParameters = Component("ui/Task_1/layouts/Side1.json", 0)["queryParameters"];
        Assert.Equal("asia", Text(queryParameters?["region"]));
        Assert.Equal("""["dataModel","Animals.IsForeign"]""", Compact(queryParameters?["foreign"]));
    }

    [Fact]
    public async Task LeavesTheComponentAloneWhenTheQueryParameterNameIsAlreadyTaken()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "colors",
                    "type": "Checkboxes",
                    "optionsId": "colors",
                    "mapping": { "Animals.IsForeign": "foreign" },
                    "queryParameters": { "foreign": "true" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.True(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("colors", warning, StringComparison.Ordinal);

        var component = Component("ui/Task_1/layouts/Side1.json", 0);
        Assert.True(component.ContainsKey("mapping"));
        Assert.Equal("true", Text(component["queryParameters"]?["foreign"]));
    }

    [Fact]
    public async Task KeepsMappingOnComponentsWhereItStillMeansSomething()
    {
        var before = """
            {
              "data": {
                "layout": [
                  {
                    "id": "instantiate",
                    "type": "InstantiationButton",
                    "mapping": { "Skjema.Name": "name" }
                  },
                  {
                    "id": "order",
                    "type": "PaymentDetails",
                    "mapping": { "Skjema.Amount": "amount" }
                  },
                  {
                    "id": "start",
                    "type": "Button",
                    "mode": "instantiate",
                    "mapping": { "Skjema.Name": "name" }
                  }
                ]
              }
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", before);

        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.Empty(result.Warnings);
        Assert.Equal(before, _app.Read("ui/Task_1/layouts/Side1.json"));
    }

    [Fact]
    public async Task ReplacesBindingToShowInSummaryWithTheMatchingBindingName()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "people",
                    "type": "List",
                    "dataListId": "people",
                    "dataModelBindings": { "name": "SelectedItem", "age": "SelectedAge" },
                    "bindingToShowInSummary": "SelectedItem"
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.SummaryBindingsConverted);
        Assert.False(result.ManualActionRequired);

        var component = Component("ui/Task_1/layouts/Side1.json", 0);
        Assert.False(component.ContainsKey("bindingToShowInSummary"));
        Assert.Equal("name", Text(component["summaryBinding"]));
    }

    [Fact]
    public async Task ResolvesBindingsWrittenAsDataTypeAndField()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "people",
                    "type": "List",
                    "dataListId": "people",
                    "dataModelBindings": {
                      "name": { "dataType": "model", "field": "SelectedItem" }
                    },
                    "bindingToShowInSummary": "SelectedItem"
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.SummaryBindingsConverted);
        Assert.Equal("name", Text(Component("ui/Task_1/layouts/Side1.json", 0)["summaryBinding"]));
    }

    [Fact]
    public async Task DropsBindingToShowInSummaryWhenSummaryBindingIsAlreadySet()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "people",
                    "type": "List",
                    "dataListId": "people",
                    "dataModelBindings": { "name": "SelectedItem" },
                    "summaryBinding": "name",
                    "bindingToShowInSummary": "SelectedItem"
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.SummaryBindingsConverted);
        Assert.Empty(result.Warnings);

        var component = Component("ui/Task_1/layouts/Side1.json", 0);
        Assert.False(component.ContainsKey("bindingToShowInSummary"));
        Assert.Equal("name", Text(component["summaryBinding"]));
    }

    [Fact]
    public async Task AsksForHelpWhenNoBindingPointsAtTheSummaryField()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "people",
                    "type": "List",
                    "dataListId": "people",
                    "dataModelBindings": { "name": "SelectedItem" },
                    "bindingToShowInSummary": "SomethingElse"
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.True(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("SomethingElse", warning, StringComparison.Ordinal);
        Assert.True(Component("ui/Task_1/layouts/Side1.json", 0).ContainsKey("bindingToShowInSummary"));
    }

    [Fact]
    public async Task ConvertsBothPropertiesOnTheSameListComponent()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "people",
                    "type": "List",
                    "dataListId": "people",
                    "dataModelBindings": { "name": "SelectedItem" },
                    "bindingToShowInSummary": "SelectedItem",
                    "mapping": { "Search": "search" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(1, result.QueryParametersConverted);
        Assert.Equal(1, result.SummaryBindingsConverted);

        var component = Component("ui/Task_1/layouts/Side1.json", 0);
        Assert.Equal("name", Text(component["summaryBinding"]));
        Assert.Equal("""["dataModel","Search"]""", Compact(component["queryParameters"]?["search"]));
    }

    [Fact]
    public async Task DropsAnEmptyMappingWithoutAddingEmptyQueryParameters()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "colors",
                    "type": "Dropdown",
                    "optionsId": "colors",
                    "mapping": {}
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(0, result.QueryParametersConverted);
        Assert.Empty(result.Warnings);

        var component = Component("ui/Task_1/layouts/Side1.json", 0);
        Assert.False(component.ContainsKey("mapping"));
        Assert.False(component.ContainsKey("queryParameters"));
    }

    [Fact]
    public async Task IgnoresJsonFilesOutsideLayoutFolders()
    {
        var before = """
            {
              "data": {
                "layout": [
                  {
                    "id": "colors",
                    "type": "Dropdown",
                    "mapping": { "Animals.IsForeign": "foreign" }
                  }
                ]
              }
            }
            """;
        _app.Write("ui/Task_1/Settings.json", before);

        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(before, _app.Read("ui/Task_1/Settings.json"));
    }

    [Fact]
    public async Task SkipsAppsWithoutAUiFolder()
    {
        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(0, result.QueryParametersConverted);
        Assert.Equal(0, result.SummaryBindingsConverted);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task LeavesNorwegianCharactersAsTheyWere()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "colors",
                    "type": "Dropdown",
                    "optionsId": "colors",
                    "textResourceBindings": { "title": "Velg farge på dyret" },
                    "dataModelBindings": { "simpleBinding": "Dyr.Farge_æøå" },
                    "formatting": { "number": { "format": "+47 ### ## ###" } },
                    "mapping": { "Animals.IsForeign": "foreign" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        var written = _app.Read("ui/Task_1/layouts/Side1.json");
        Assert.Contains("Velg farge på dyret", written, StringComparison.Ordinal);
        Assert.Contains("Dyr.Farge_æøå", written, StringComparison.Ordinal);
        Assert.Contains("+47 ### ## ###", written, StringComparison.Ordinal);
        Assert.DoesNotContain("\\u", written, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesFilesWithCommentsForTheDeveloper()
    {
        var before = """
            {
              "data": {
                "layout": [
                  {
                    // The colours on offer depend on where the animal is from
                    "id": "colors",
                    "type": "Dropdown",
                    "optionsId": "colors",
                    "mapping": { "Animals.IsForeign": "foreign" }
                  }
                ]
              }
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", before);

        var result = await Migrate();

        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(before, _app.Read("ui/Task_1/layouts/Side1.json"));
        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, warning => warning.Contains("comments", StringComparison.Ordinal));
    }

    [Fact]
    public async Task DoesNotMistakeASlashInsideAStringForAComment()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
              "data": {
                "layout": [
                  {
                    "id": "colors",
                    "type": "Dropdown",
                    "optionsId": "colors",
                    "mapping": { "Animals.IsForeign": "foreign" }
                  }
                ]
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        Assert.Empty(result.Warnings);
        Assert.Equal(
            """["dataModel","Animals.IsForeign"]""",
            Compact(Component("ui/Task_1/layouts/Side1.json", 0)["queryParameters"]?["foreign"])
        );
    }

    [Fact]
    public async Task DoesNotAddAByteOrderMarkToAFileThatHadNone()
    {
        _app.Write("ui/Task_1/layouts/Side1.json", LayoutWithSomethingToReformat);
        _app.CommitEverything();

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        Assert.False(StartsWithBom(_app.ReadBytes("ui/Task_1/layouts/Side1.json")));
    }

    [Fact]
    public async Task KeepsTheByteOrderMarkOnAFileThatHadOne()
    {
        _app.WriteBytes(
            "ui/Task_1/layouts/Side1.json",
            [0xEF, 0xBB, 0xBF, .. System.Text.Encoding.UTF8.GetBytes(LayoutWithSomethingToReformat)]
        );
        _app.CommitEverything();

        var result = await Migrate();

        Assert.Equal(1, result.FilesChanged);
        Assert.True(StartsWithBom(_app.ReadBytes("ui/Task_1/layouts/Side1.json")));
    }

    /// <summary>
    /// A layout the migrator changes, holding an array compact enough that reserializing expands it -
    /// so the run produces a whitespace-only hunk for the restoration pass to put back.
    /// </summary>
    private const string LayoutWithSomethingToReformat = """
        {
          "data": {
            "layout": [
              {
                "id": "colors",
                "type": "Dropdown",
                "optionsId": "colors",
                "mapping": { "Animals.IsForeign": "foreign" }
              },
              {
                "id": "spacer1",
                "type": "Paragraph",
                "textResourceBindings": {
                  "title": "Something between the two so they land in separate hunks"
                }
              },
              {
                "id": "spacer2",
                "type": "Paragraph",
                "textResourceBindings": {
                  "title": "And a little more, for the same reason"
                }
              },
              {
                "id": "group",
                "type": "AccordionGroup",
                "children": ["first", "second"]
              }
            ]
          }
        }
        """;

    private static bool StartsWithBom(byte[] bytes) =>
        bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF;
}
