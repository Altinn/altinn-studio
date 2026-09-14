using System.Text;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Pins the v9 cleanup of <c>labelSettings.optionalIndicator: true</c>, which became the default.
/// </summary>
public sealed class OptionalIndicatorLayoutMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task RemovesEnabledOptionalIndicatorAndEmptyLabelSettings()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  {
                    "id": "only-indicator",
                    "type": "Input",
                    "labelSettings": { "optionalIndicator": true },
                    "textResourceBindings": { "title": "Fødselsnummer" }
                  },
                  {
                    "id": "with-other-setting",
                    "type": "Input",
                    "labelSettings": { "optionalIndicator": true, "someFutureSetting": 1 }
                  },
                  {
                    "id": "disabled",
                    "type": "Input",
                    "labelSettings": { "optionalIndicator": false }
                  },
                  {
                    "id": "no-settings",
                    "type": "Input"
                  }
                ]
              }
            }

            """
        );

        var result = await OptionalIndicatorLayoutMigration.Migrate(_app.Root);

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(2, result.PropertiesRemoved);
        Assert.Empty(result.Warnings);

        var content = _app.Read("ui/Task_1/layouts/Side1.json");
        var components = ReadComponents(content);
        Assert.False(components[0].ContainsKey("labelSettings"));
        var withOther = Assert.IsType<JsonObject>(components[1]["labelSettings"]);
        Assert.False(withOther.ContainsKey("optionalIndicator"));
        Assert.True(withOther.ContainsKey("someFutureSetting"));
        var disabled = Assert.IsType<JsonObject>(components[2]["labelSettings"]);
        Assert.False(Assert.IsAssignableFrom<JsonValue>(disabled["optionalIndicator"]).GetValue<bool>());
        Assert.Contains("Fødselsnummer", content, StringComparison.Ordinal);
        Assert.EndsWith("\n", content, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemovesFromNestedComponents()
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
                    "children": [
                      { "id": "nested", "type": "Input", "labelSettings": { "optionalIndicator": true } }
                    ]
                  }
                ]
              }
            }
            """
        );

        var result = await OptionalIndicatorLayoutMigration.Migrate(_app.Root);

        Assert.Equal(1, result.PropertiesRemoved);
        Assert.DoesNotContain("optionalIndicator", _app.Read("ui/Task_1/layouts/Side1.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesLayoutsWithoutTheSettingAndNonLayoutFilesUntouched()
    {
        const string layout = """
            {
              "data": {
                "layout": [{ "id": "a", "type": "Input", "labelSettings": { "optionalIndicator": false } }]
              }
            }
            """;
        const string settings = "{ \"labelSettings\": { \"optionalIndicator\": true } }";
        _app.Write("ui/Task_1/layouts/Side1.json", layout);
        _app.Write("ui/Task_1/Settings.json", settings);

        var result = await OptionalIndicatorLayoutMigration.Migrate(_app.Root);

        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(0, result.PropertiesRemoved);
        Assert.Equal(layout, _app.Read("ui/Task_1/layouts/Side1.json"));
        Assert.Equal(settings, _app.Read("ui/Task_1/Settings.json"));
    }

    [Fact]
    public async Task SkipsFilesWithCommentsAndWarns()
    {
        const string layout = """
            {
              // Page one
              "data": { "layout": [{ "id": "a", "type": "Input", "labelSettings": { "optionalIndicator": true } }] }
            }
            """;
        _app.Write("ui/Task_1/layouts/Side1.json", layout);

        var result = await OptionalIndicatorLayoutMigration.Migrate(_app.Root);

        Assert.Equal(0, result.FilesChanged);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("Side1.json", warning, StringComparison.Ordinal);
        Assert.Contains("comments", warning, StringComparison.Ordinal);
        Assert.Equal(layout, _app.Read("ui/Task_1/layouts/Side1.json"));
    }

    [Fact]
    public async Task PreservesUtf8BomAndIsIdempotent()
    {
        const string layout =
            "{ \"data\": { \"layout\": [{ \"id\": \"a\", \"labelSettings\": { \"optionalIndicator\": true } }] } }\n";
        var withBom = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(layout)).ToArray();
        _app.WriteBytes("ui/Task_1/layouts/Side1.json", withBom);

        var first = await OptionalIndicatorLayoutMigration.Migrate(_app.Root);
        var bytesAfterFirst = _app.ReadBytes("ui/Task_1/layouts/Side1.json");
        var second = await OptionalIndicatorLayoutMigration.Migrate(_app.Root);

        Assert.Equal(1, first.PropertiesRemoved);
        Assert.Equal(0, second.PropertiesRemoved);
        Assert.True(bytesAfterFirst.AsSpan().StartsWith(Encoding.UTF8.GetPreamble()));
        Assert.Equal(bytesAfterFirst, _app.ReadBytes("ui/Task_1/layouts/Side1.json"));
    }

    private static List<JsonObject> ReadComponents(string content)
    {
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(content));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var layout = Assert.IsType<JsonArray>(data["layout"]);
        return layout.Select(component => Assert.IsType<JsonObject>(component)).ToList();
    }
}
