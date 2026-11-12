using System.Text;
using System.Text.Json;
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
            _app.Read("models/model.calculation.json")
        );
        var message = Assert.Single(result.Messages);
        Assert.Contains("models/model.calculation.json", message.Text);
        Assert.False(result.RequiresManualFollowUp);
    }

    [Fact]
    public async Task ConvertedFileHasEveryCalculationAsFieldAndExpression()
    {
        _app.Write(
            "models/model.calculation.json",
            """{"calculations":{"a":{"expression":1},"b":{ },"c":{"expression":["dataModel","a"]}}}"""
        );

        await CalculationListMigration.Migrate(_app.Root);

        using var document = JsonDocument.Parse(_app.Read("models/model.calculation.json"));
        var calculations = document.RootElement.GetProperty("calculations").EnumerateArray().ToList();
        Assert.Equal(["a", "b", "c"], calculations.Select(c => c.GetProperty("field").GetString()));
        Assert.Equal(1, calculations[0].GetProperty("expression").GetInt32());
        Assert.False(calculations[1].TryGetProperty("expression", out _));
        Assert.Equal("""["dataModel","a"]""", calculations[2].GetProperty("expression").GetRawText());
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

    [Theory]
    [InlineData("""{ "calculations": { "a": null } }""")]
    [InlineData("""{ "calculations": { "a": { "expression": 1 } """)]
    [InlineData("""{ "calculations": "a" }""")]
    public async Task LeavesFilesItCannotConvertAsTodo(string content)
    {
        _app.Write("models/model.calculation.json", content);

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read("models/model.calculation.json"));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("models/model.calculation.json", todo);
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
        Assert.Equal(
            """{"calculations":[{"field": "b","expression":2}]}""",
            _app.Read("models/second.calculation.json")
        );
        Assert.Equal(2, result.Messages.Count);
    }

    [Fact]
    public async Task SkipsAppWithoutModelsFolder()
    {
        _app.Write("config/applicationmetadata.json", "{}");

        var result = await CalculationListMigration.Migrate(_app.Root);

        Assert.Empty(result.Messages);
    }
}
