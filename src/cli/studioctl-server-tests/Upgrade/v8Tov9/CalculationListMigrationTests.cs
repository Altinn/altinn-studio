using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CalculationListMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task ConvertsCalculationsKeyedByFieldAndKeepsCommentsAndFormatting()
    {
        _app.Write(
            "models/model.calculation.json",
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/calculation/calculation.schema.v1.json",
              // Totals
              "calculations": {
                "skjema.total": {
                  // Price times quantity
                  "expression": ["multiply", ["dataModel", "skjema.price"], ["dataModel", "skjema.quantity"]],
                },
                "skjema.rows.label": { "expression": ["argv", 0] },
                "skjema.\"quoted\"": {"expression": "fixed"},
              },
            }
            """
        );

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/calculation/calculation.schema.v1.json",
              // Totals
              "calculations": [
                {
                  "field": "skjema.total",
                  // Price times quantity
                  "expression": ["multiply", ["dataModel", "skjema.price"], ["dataModel", "skjema.quantity"]],
                },
                { "field": "skjema.rows.label", "expression": ["argv", 0] },
                {"field": "skjema.\"quoted\"","expression": "fixed"},
              ],
            }
            """,
            ReadConverted("models/model.calculation.json")
        );
        var message = Assert.Single(result.Messages);
        Assert.Contains("models/model.calculation.json", message.Text);
        Assert.False(result.RequiresManualFollowUp);
    }

    [Theory]
    [InlineData(
        "{\"calculations\":{\"a\": // why\n {\"expression\":1}}}",
        "{\"calculations\":[// why\n {\"field\": \"a\",\"expression\":1}]}"
    )]
    [InlineData(
        """{"calculations":{"a": /* keep me */ {"expression":1}}}""",
        """{"calculations":[/* keep me */ {"field": "a","expression":1}]}"""
    )]
    [InlineData(
        """{"calculations":{"a": {/* c */ "expression":1}}}""",
        """{"calculations":[{"field": "a",/* c */ "expression":1}]}"""
    )]
    public async Task KeepsCommentsAroundTheBrace(string content, string expected)
    {
        _app.Write("models/model.calculation.json", content);

        await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(expected, ReadConverted("models/model.calculation.json"));
    }

    [Theory]
    [InlineData(
        "{\r\n\t\"calculations\": {\r\n\t\t\"a\": {\r\n\t\t\t\"expression\": 1\r\n\t\t}\r\n\t}\r\n}\r\n",
        "{\r\n\t\"calculations\": [\r\n\t\t{\r\n\t\t\t\"field\": \"a\",\r\n\t\t\t\"expression\": 1\r\n\t\t}\r\n\t]\r\n}\r\n"
    )]
    [InlineData("""{"calculations":{}}""", """{"calculations":[]}""")]
    [InlineData("""{"Calculations":{"a":{"expression":1}}}""", """{"Calculations":[{"field": "a","expression":1}]}""")]
    [InlineData(
        """{"calculations":{"a":{"expression":1,"description":"x","Hidden":true}}}""",
        """{"calculations":[{"field": "a","expression":1,"description":"x","Hidden":true}]}"""
    )]
    public async Task ConvertsByteForByte(string content, string expected)
    {
        _app.Write("models/model.calculation.json", content);

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(expected, ReadConverted("models/model.calculation.json"));
        Assert.Single(result.Messages);
        Assert.False(result.RequiresManualFollowUp);
    }

    [Fact]
    public async Task LeavesCalculationsWithoutExpressionAsTodo()
    {
        var content = """{"calculations":{"a":{"expression":1},"b":{ },"c":{ /* todo */ }}}""";
        _app.Write("models/model.calculation.json", content);

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read("models/model.calculation.json"));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("models/model.calculation.json", todo);
        Assert.Contains("the calculation for \"b\" has no \"expression\"", todo);
        Assert.Contains("the calculation for \"c\" has no \"expression\"", todo);
        Assert.DoesNotContain("\"a\"", todo);
        Assert.Contains("run the upgrade again", todo);
    }

    [Theory]
    [InlineData(
        """{ "calculations": { "": { "expression": 1 } } }""",
        "the calculation for \"\" has an empty field name"
    )]
    [InlineData(
        """{ "calculations": { " ": { "expression": 1 } } }""",
        "the calculation for \" \" has an empty field name"
    )]
    [InlineData(
        """{ "calculations": { "a": { "expression": 1, "field": "other" } } }""",
        "the calculation for \"a\" has a \"field\" property"
    )]
    [InlineData("""{ "calculations": { "a": null } }""", "the calculation for \"a\" is not an object")]
    [InlineData("""{ "calculations": { "a": ["dataModel", "b"] } }""", "the calculation for \"a\" is not an object")]
    [InlineData("""{ "calculations": null }""", "\"calculations\" is null")]
    [InlineData("""{ "calculations": "a" }""", "\"calculations\" is neither an object keyed by field nor a list")]
    [InlineData(
        """{ "calculations": { "a": { "expression": 1 } }, "calculations": { "b": { "expression": 2 } } }""",
        "\"calculations\" appears more than once"
    )]
    [InlineData(
        """{ "calculations": { "a": { "expression": 1 } }, "Calculations": [] }""",
        "\"calculations\" appears more than once"
    )]
    [InlineData("[]", "the file is not a JSON object")]
    public async Task LeavesCalculationsItCannotConvertAsTodo(string content, string problem)
    {
        _app.Write("models/model.calculation.json", content);

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read("models/model.calculation.json"));
        var todo = Assert.Single(result.Todos);
        Assert.StartsWith("Convert calculations in models/model.calculation.json to a list of", todo);
        Assert.Contains(problem, todo);
    }

    [Theory]
    [InlineData("""{ "calculations": { "a": { "expression": 1 } """)]
    [InlineData("")]
    [InlineData("""{ "calculations": { "a": { "expression": 1 } } } xyz""")]
    public async Task LeavesFilesThatAreNotJsonAsTodo(string content)
    {
        _app.Write("models/model.calculation.json", content);

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read("models/model.calculation.json"));
        var todo = Assert.Single(result.Todos);
        Assert.StartsWith("Fix models/model.calculation.json by hand: it is not valid JSON.", todo);
    }

    [Theory]
    [InlineData("""{ "calculations": [{ "field": "a", "expression": 1 }] }""")]
    [InlineData("""{ "calculations": [] }""")]
    [InlineData("""{ "$schema": "x" }""")]
    public async Task LeavesListsAndFilesWithoutCalculationsUnchanged(string content)
    {
        _app.Write("models/model.calculation.json", content);

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read("models/model.calculation.json"));
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task ConvertingAgainChangesNothing()
    {
        _app.Write(
            "models/model.calculation.json",
            """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/calculation/calculation.schema.v1.json",
                "calculations": {
                    "price": {
                        "expression": 200
                    }
                }
            }
            """
        );
        await CalculationListMigration.Migrate(_app.Root);
        var converted = _app.ReadBytes("models/model.calculation.json");

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(converted, _app.ReadBytes("models/model.calculation.json"));
        Assert.Empty(result.Messages);
        AssertLoadsInV9(ReadConverted("models/model.calculation.json"));
    }

    [Fact]
    public async Task KeepsByteOrderMarkAndConvertsEveryModel()
    {
        var withBom = Encoding.UTF8.GetBytes("""{"calculations":{"a":{"expression":1}}}""");
        _app.WriteBytes("models/first.calculation.json", [.. Encoding.UTF8.Preamble, .. withBom]);
        _app.Write("models/second.calculation.json", """{"calculations":{"b":{"expression":2}}}""");

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(
            [.. Encoding.UTF8.Preamble, .. """{"calculations":[{"field": "a","expression":1}]}"""u8.ToArray()],
            _app.ReadBytes("models/first.calculation.json")
        );
        AssertLoadsInV9(ReadConverted("models/first.calculation.json"));
        Assert.Equal(
            """{"calculations":[{"field": "b","expression":2}]}""",
            ReadConverted("models/second.calculation.json")
        );
        Assert.Equal(2, result.Messages.Count);
    }

    [Theory]
    [InlineData("models/sub/model.calculation.json")]
    [InlineData("models/model.Calculation.json")]
    [InlineData("models/.calculation.json")]
    public async Task IgnoresFilesTheAppDoesNotRead(string path)
    {
        var content = """{"calculations":{"a":{"expression":1}}}""";
        _app.Write(path, content);

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read(path));
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task SkipsAppWithoutModelsFolder()
    {
        _app.Write("config/applicationmetadata.json", "{}");

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Empty(result.Messages);
    }

    /// <summary>The converted file, checked to load the way the v9 app loads it.</summary>
    private string ReadConverted(string relativePath)
    {
        var json = _app.Read(relativePath);
        AssertLoadsInV9(json);
        return json;
    }

    /// <summary>
    /// Parses the file with the rules of Altinn.App.Core's CalculationConfig and CalculationItem, which this test
    /// project cannot reference: names regardless of case, comments and trailing commas allowed, "calculations",
    /// "field" and "expression" required, no null calculations or items, no blank field.
    /// </summary>
    private static void AssertLoadsInV9(string json)
    {
        var config = JsonSerializer.Deserialize<V9CalculationConfig>(json, _v9Options);
        Assert.NotNull(config);
        Assert.NotNull(config.Calculations);
        Assert.All(
            config.Calculations,
            static item =>
            {
                Assert.NotNull(item);
                Assert.False(string.IsNullOrWhiteSpace(item.Field));
            }
        );
    }

    private static readonly JsonSerializerOptions _v9Options = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    private sealed record V9CalculationConfig
    {
        [JsonPropertyName("calculations")]
        public required List<V9CalculationItem?>? Calculations { get; init; }
    }

    private sealed record V9CalculationItem
    {
        [JsonPropertyName("field")]
        public required string? Field { get; init; }

        [JsonPropertyName("expression")]
        public required JsonElement Expression { get; init; }
    }
}
