using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Pins the v9 cleanup of text overrides tied to the old asterisk marker for required fields.
/// </summary>
public sealed class RequiredIndicatorTextMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task RemovesAsteriskOverrideAndDescriptionButKeepsOtherTexts()
    {
        _app.Write(
            "config/texts/resource.nb.json",
            """
            {
              "language": "nb",
              "resources": [
                { "id": "appName", "value": "Søknad om støtte" },
                { "id": "form_filler.required_label", "value": "*" },
                { "id": "form_filler.required_description", "value": "Felt merket med * må fylles ut" },
                { "id": "general.optional", "value": "Frivillig" }
              ]
            }

            """
        );

        var result = await RequiredIndicatorTextMigration.Migrate(_app.Root);

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(1, result.AsteriskOverridesRemoved);
        Assert.Equal(1, result.DescriptionOverridesRemoved);
        Assert.Empty(result.Warnings);

        var content = _app.Read("config/texts/resource.nb.json");
        var ids = ReadResourceIds(content);
        Assert.Equal(["appName", "general.optional"], ids);
        Assert.Contains("Søknad om støtte", content, StringComparison.Ordinal);
        Assert.EndsWith("\n", content, StringComparison.Ordinal);
    }

    [Fact]
    public async Task TreatsAsteriskWithSurroundingWhitespaceAsTheOldDefault()
    {
        _app.Write(
            "config/texts/resource.en.json",
            """
            {
              "language": "en",
              "resources": [{ "id": "form_filler.required_label", "value": " * " }]
            }
            """
        );

        var result = await RequiredIndicatorTextMigration.Migrate(_app.Root);

        Assert.Equal(1, result.AsteriskOverridesRemoved);
        Assert.Empty(ReadResourceIds(_app.Read("config/texts/resource.en.json")));
    }

    [Fact]
    public async Task KeepsCustomRequiredLabelAndWarnsAboutIt()
    {
        const string content = """
            {
              "language": "nb",
              "resources": [{ "id": "form_filler.required_label", "value": "(obligatorisk)" }]
            }
            """;
        _app.Write("config/texts/resource.nb.json", content);

        var result = await RequiredIndicatorTextMigration.Migrate(_app.Root);

        Assert.Equal(0, result.FilesChanged);
        Assert.Equal(0, result.AsteriskOverridesRemoved);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("resource.nb.json", warning, StringComparison.Ordinal);
        Assert.Contains("(obligatorisk)", warning, StringComparison.Ordinal);
        Assert.Contains("Må fylles ut", warning, StringComparison.Ordinal);
        Assert.Equal(content, _app.Read("config/texts/resource.nb.json"));
    }

    [Fact]
    public async Task LeavesFilesWithoutTheOverridesUntouched()
    {
        const string content = """
            {
              "language": "nb",
              "resources": [{ "id": "general.optional", "value": "Frivillig" }]
            }
            """;
        _app.Write("config/texts/resource.nb.json", content);

        var result = await RequiredIndicatorTextMigration.Migrate(_app.Root);

        Assert.Equal(0, result.FilesChanged);
        Assert.Empty(result.Warnings);
        Assert.Equal(content, _app.Read("config/texts/resource.nb.json"));
    }

    [Fact]
    public async Task SkipsFilesWithCommentsAndWarns()
    {
        const string content = """
            {
              // Texts for the app
              "language": "nb",
              "resources": [{ "id": "form_filler.required_label", "value": "*" }]
            }
            """;
        _app.Write("config/texts/resource.nb.json", content);

        var result = await RequiredIndicatorTextMigration.Migrate(_app.Root);

        Assert.Equal(0, result.FilesChanged);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("comments", warning, StringComparison.Ordinal);
        Assert.Equal(content, _app.Read("config/texts/resource.nb.json"));
    }

    [Fact]
    public async Task ReturnsEmptyResultWhenThereIsNoTextsDirectory()
    {
        var result = await RequiredIndicatorTextMigration.Migrate(_app.Root);

        Assert.Equal(0, result.FilesChanged);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task PreservesUtf8BomAndIsIdempotent()
    {
        const string content = """
            { "language": "nb", "resources": [{ "id": "form_filler.required_label", "value": "*" }] }

            """;
        var withBom = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(content)).ToArray();
        _app.WriteBytes("config/texts/resource.nb.json", withBom);

        var first = await RequiredIndicatorTextMigration.Migrate(_app.Root);
        var bytesAfterFirst = _app.ReadBytes("config/texts/resource.nb.json");
        var second = await RequiredIndicatorTextMigration.Migrate(_app.Root);

        Assert.Equal(1, first.AsteriskOverridesRemoved);
        Assert.Equal(0, second.AsteriskOverridesRemoved);
        Assert.True(bytesAfterFirst.AsSpan().StartsWith(Encoding.UTF8.GetPreamble()));
        Assert.Equal(bytesAfterFirst, _app.ReadBytes("config/texts/resource.nb.json"));
    }

    private static List<string> ReadResourceIds(string content)
    {
        using var _ = JsonDocument.Parse(content);
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(content));
        var resources = Assert.IsType<JsonArray>(root["resources"]);
        return resources
            .Select(entry =>
                Assert.IsAssignableFrom<JsonValue>(Assert.IsType<JsonObject>(entry)["id"]).GetValue<string>()
            )
            .ToList();
    }
}
