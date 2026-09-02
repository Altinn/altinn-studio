using System.Text;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class GridXlMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task RemovesXlWithoutCreatingLgAndPreservesFallbackSettings()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "with-md",
                    "type": "Input",
                    "grid": { "xs": 12, "md": 6, "xl": 4 }
                  },
                  {
                    "id": "only-xl",
                    "type": "Input",
                    "grid": { "xl": 8 },
                    "textResourceBindings": { "title": "Velg kjønn" }
                  }
                ]
              }
            }
            """
        );

        var result = await GridXlMigration.Migrate(_app.Root);

        Assert.Equal(2, result.PropertiesRemoved);
        var grids = ReadComponentGrids("ui/Task_1/layouts/Side1.json");
        Assert.Equal(6, Assert.IsAssignableFrom<JsonValue>(grids[0]["md"]).GetValue<int>());
        Assert.False(grids[0].ContainsKey("lg"));
        Assert.False(grids[0].ContainsKey("xl"));
        Assert.Empty(grids[1]);
        Assert.Contains("Velg kjønn", _app.Read("ui/Task_1/layouts/Side1.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemovesXlFromAllGridShapesAndNestedComponents()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "group",
                    "type": "Group",
                    "grid": {
                      "lg": 8,
                      "xl": 8,
                      "innerGrid": { "md": 6, "xl": 4 },
                      "labelGrid": { "lg": 4, "xl": 3 },
                      "validationGrid": { "xs": 12, "xl": 10 }
                    },
                    "children": [
                      {
                        "id": "nested",
                        "type": "Input",
                        "grid": { "lg": 6, "xl": 6 }
                      }
                    ]
                  }
                ]
              }
            }
            """
        );

        var result = await GridXlMigration.Migrate(_app.Root);

        Assert.Equal(5, result.PropertiesRemoved);
        Assert.DoesNotContain("\"xl\"", _app.Read("ui/Task_1/layouts/Side1.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesUnrelatedXlPropertiesAndNonLayoutFilesUntouched()
    {
        const string layout = """
            {
              "data": {
                "layout": [
                  {
                    "id": "custom",
                    "type": "Custom",
                    "xl": "unrelated",
                    "settings": { "xl": 42 }
                  }
                ]
              }
            }
            """;
        const string settings = "{ \"grid\": { \"xl\": 4 } }";
        _app.Write("ui/Task_1/layouts/Side1.json", layout);
        _app.Write("ui/Task_1/Settings.json", settings);

        var result = await GridXlMigration.Migrate(_app.Root);

        Assert.Equal(0, result.PropertiesRemoved);
        Assert.Equal(layout, _app.Read("ui/Task_1/layouts/Side1.json"));
        Assert.Equal(settings, _app.Read("ui/Task_1/Settings.json"));
    }

    [Fact]
    public async Task PreservesUtf8BomAndIsIdempotent()
    {
        const string layout = "{ \"data\": { \"layout\": [{ \"grid\": { \"xl\": 12 } }] } }\n";
        var withBom = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(layout)).ToArray();
        _app.WriteBytes("ui/Task_1/layouts/Side1.json", withBom);

        var first = await GridXlMigration.Migrate(_app.Root);
        var bytesAfterFirst = _app.ReadBytes("ui/Task_1/layouts/Side1.json");
        var second = await GridXlMigration.Migrate(_app.Root);

        Assert.Equal(1, first.PropertiesRemoved);
        Assert.Equal(0, second.PropertiesRemoved);
        Assert.True(bytesAfterFirst.AsSpan().StartsWith(Encoding.UTF8.GetPreamble()));
        Assert.Equal(bytesAfterFirst, _app.ReadBytes("ui/Task_1/layouts/Side1.json"));
    }

    private List<JsonObject> ReadComponentGrids(string relativePath)
    {
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read(relativePath)));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var layout = Assert.IsType<JsonArray>(data["layout"]);
        return layout
            .Select(component => Assert.IsType<JsonObject>(Assert.IsType<JsonObject>(component)["grid"]))
            .ToList();
    }
}
