using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class SaveWhileTypingMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task RemovesTrueAndReplacesFalseWithLongTimeoutInOneWarning()
    {
        _app.Write(
            "ui/Task_1/layouts/Side1.json",
            """
            {
              "data": {
                "layout": [
                  { "id": "on", "type": "Input", "saveWhileTyping": true },
                  { "id": "first", "type": "Input", "saveWhileTyping": false },
                  { "id": "second", "type": "TextArea", "saveWhileTyping": false }
                ]
              }
            }
            """
        );

        var warning = await SaveWhileTypingMigration.Migrate(_app.Root);

        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/Side1.json")));
        var layout = Assert.IsType<JsonArray>(root["data"]?["layout"]);
        Assert.False(Assert.IsType<JsonObject>(layout[0]).ContainsKey("saveWhileTyping"));
        Assert.Equal(4000, layout[1]?["saveWhileTyping"]?.GetValue<int>());
        Assert.NotNull(warning);
        Assert.Contains("Side1.json (Input 'first', TextArea 'second')", warning, StringComparison.Ordinal);
    }
}
