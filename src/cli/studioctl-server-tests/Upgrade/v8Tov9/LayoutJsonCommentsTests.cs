using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class LayoutJsonCommentsTests
{
    [Fact]
    public void KeepsCommentsWhenTheirPropertiesAndContainersAreRemoved()
    {
        const string original = """
            // File explanation: æøå
            {
              // Rename this binding
              "old/name": /* Before value */ "value",
              "removed": {
                /* Keep this knowledge even after removal */
                "setting": true
              },
              "items": [
                // First item
                { "id": "one", "value": 1 },
                /* Second item */ { "id": "two", "value": 2 }
              ],
              "url": "https://example.test/*literal*/" // Trailing comment
            }
            // File footer
            """;
        const string updated = """
            { "newName": "value", "items": [{"id":"one","value":3},{"id":"two","value":2}], "url":"https://example.test/*literal*/" }
            """;

        var result = LayoutJsonComments.Restore(original, updated);

        foreach (
            var comment in new[]
            {
                "// File explanation: æøå",
                "// Rename this binding",
                "/* Before value */",
                "/* Keep this knowledge even after removal */",
                "// First item",
                "/* Second item */",
                "// Trailing comment",
                "// File footer",
            }
        )
            Assert.Equal(1, result.Split(comment, StringSplitOptions.None).Length - 1);
        Assert.True(JsonNode.DeepEquals(Parse(updated), Parse(result)));
    }

    [Fact]
    public void DoesNotTreatStringsAsComments()
    {
        const string json = """{"url":"https://example.test", "text":"/* not a comment */"}""";
        Assert.Equal(json, LayoutJsonComments.Restore(json, json));
    }

    private static JsonNode? Parse(string json) =>
        JsonNode.Parse(
            json,
            documentOptions: new JsonDocumentOptions
            {
                CommentHandling = JsonCommentHandling.Skip,
                AllowTrailingCommas = true,
            }
        );
}
