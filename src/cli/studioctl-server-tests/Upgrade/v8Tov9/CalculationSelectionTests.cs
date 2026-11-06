using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CalculationSelectionTests
{
    private const string Sum =
        "let sum = 0; obj.checkbox.split(',').forEach(id => { const key = `val${id}`; sum += obj[key] ? +obj[key] : 0; }); return sum;";

    [Theory]
    [InlineData("if (obj.checkbox == null) return 0; " + Sum)]
    [InlineData(
        "if (obj.checkbox == null) return 0; let sum = 0; const ids = obj.checkbox.split(','); ids.forEach(id => { const key = `val${id}`; sum += obj[key] ? +obj[key] : 0; }); return sum;"
    )]
    [InlineData(
        "if (obj.checkbox == null) return 0; const key = 1; let sum = 0; obj.checkbox.split(',').forEach(id => { const key = `val${id}`; sum += obj[key] ? +obj[key] : 0; }); return sum + key;"
    )]
    [InlineData(
        "if (obj.checkbox == null) return 0; let sum = 0; obj.checkbox.split(',').forEach(id => { const key = `val${parseInt(id) + 0}`; sum += obj[key] ? +obj[key] : 0; }); return sum;"
    )]
    public void FiniteCheckboxSum_ConvertsDirectAndStoredSelections(string body)
    {
        using var app = CreateApp(body);
        var result = CalculationMigration.Migrate(app.Root);
        Assert.Contains("calculate", result.ConvertedRules["form"]);
        Assert.Empty(result.FallbackReasons);
    }

    [Theory]
    [InlineData(Sum)]
    [InlineData(
        "if (obj.checkbox == null) return 0; let sum = 0; obj.checkbox.split(',').forEach(id => { const key = `val${id}`; sum += obj[key] ? +obj[key] : 0; obj.val0 = 2; }); return sum;"
    )]
    [InlineData(
        "if (obj.checkbox == null) return 0; let sum = 0; obj.checkbox.split(',').forEach(id => { const key = `val${id}`; sum += obj[key] ? +obj[key] : 1; }); return sum;"
    )]
    [InlineData(
        "if (obj.checkbox == null) return 0; let sum = 0; obj.checkbox.split(',').forEach(id => { const key = `val${id}`; sum += obj[key] ? +obj[key] : 0; sum += 1; }); return sum;"
    )]
    [InlineData(
        "if (obj.checkbox == null) return 0; let sum = 0; obj.checkbox.split(',').forEach(obj => { sum += obj.val0 ? +obj.val0 : 0; }); return sum;"
    )]
    [InlineData(
        "if (obj.checkbox == null) return 0; let sum = 0; obj.checkbox.split(',').forEach(id => { const key = `val${id}`; sum += obj[key] ? +obj[key] : 0; }); return sum + key;"
    )]
    [InlineData(
        "if (obj.checkbox == null) return 0; let sum = 0; obj.checkbox.split(',').forEach(id => { const key = 'val0'; sum += obj[key] ? +obj[key] : 0; }); return sum;"
    )]
    public void UnsafeCallbackOrMissingNullGuard_StaysOnFallback(string body)
    {
        using var app = CreateApp(body);
        var result = CalculationMigration.Migrate(app.Root);
        Assert.Empty(result.ConvertedRules);
        Assert.Single(result.FallbackReasons);
    }

    [Fact]
    public void UnmappedOptionField_StaysOnFallback()
    {
        using var app = CreateApp("if (obj.checkbox == null) return 0; " + Sum);
        app.Write("options/choices.json", "[{\"value\":\"0\"},{\"value\":\"1\"},{\"value\":\"2\"}]");
        var result = CalculationMigration.Migrate(app.Root);
        Assert.Empty(result.ConvertedRules);
        Assert.Contains(result.FallbackReasons, reason => reason.Contains("val2", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("[{\"value\":\"0\"},{\"value\":\"0\"}]")]
    [InlineData("[{\"value\":\"\"}]")]
    [InlineData("[{\"value\":\"a,b\"}]")]
    [InlineData("[{\"value\":\"Null\"}]")]
    [InlineData("[{\"value\":\"TRUE\"}]")]
    [InlineData("[{\"value\":\"false\"}]")]
    [InlineData("[{\"value\":[\"dataModel\",\"value\"]}]")]
    [InlineData("[{\"value\":\"0\",\"value\":\"1\"}]")]
    public void UnsafeOptionDomains_AreNotExpanded(string options)
    {
        using var app = CreateApp("return 0;");
        app.Write("options/choices.json", options);
        Assert.Empty(LoadOptions(app));
    }

    [Theory]
    [InlineData("source", "{}")]
    [InlineData("queryParameters", "{\"key\":\"value\"}")]
    [InlineData("mapping", "{}")]
    [InlineData("optionsId", "[\"dataModel\",\"dynamicOptions\"]")]
    public void DynamicCheckboxOptions_AreNotExpanded(string property, string value)
    {
        using var app = CreateApp("return 0;");
        var layout = JsonNode.Parse(app.Read("ui/form/layouts/page.json")) ?? throw new InvalidOperationException();
        layout["data"]?["layout"]?[0]?[property] = JsonNode.Parse(value);
        app.Write("ui/form/layouts/page.json", layout.ToJsonString());
        Assert.Empty(LoadOptions(app));
    }

    [Theory]
    [InlineData("Checkboxes", "[{\"value\":\"0\"},{\"value\":\"2\"}]")]
    [InlineData("Input", null)]
    public void ConflictingComponentsForTheSameField_InvalidateTheDomain(string type, string? options)
    {
        using var app = CreateApp("return 0;");
        var component = new JsonObject
        {
            ["id"] = "conflict",
            ["type"] = type,
            ["dataModelBindings"] = new JsonObject { ["simpleBinding"] = "selection" },
            ["options"] = options == null ? null : JsonNode.Parse(options),
        };
        app.Write(
            "ui/form/layouts/other.json",
            new JsonObject { ["data"] = new JsonObject { ["layout"] = new JsonArray(component) } }.ToJsonString()
        );
        Assert.Empty(LoadOptions(app));
    }

    [Fact]
    public void ReorderedIdenticalDomains_AreCompatibleAndCanonical()
    {
        using var app = CreateApp("return 0;");
        app.Write(
            "ui/form/layouts/other.json",
            "{\"data\":{\"layout\":[{\"id\":\"same\",\"type\":\"Checkboxes\",\"dataModelBindings\":{\"simpleBinding\":{\"field\":\"selection\",\"dataType\":\"model\"}},\"options\":[{\"value\":\"1\"},{\"value\":\"0\"}]}]}}"
        );
        Assert.Collection(
            LoadOptions(app)["selection"],
            value => Assert.Equal("0", value),
            value => Assert.Equal("1", value)
        );
    }

    [Fact]
    public void ExcessiveOptionCount_AvoidsUnboundedExpansion()
    {
        using var app = CreateApp("return 0;");
        app.Write(
            "options/choices.json",
            JsonSerializer.Serialize(
                Enumerable
                    .Range(0, 33)
                    .Select(value => new { value = value.ToString(System.Globalization.CultureInfo.InvariantCulture) })
            )
        );
        Assert.Empty(LoadOptions(app));
    }

    [Fact]
    public void DuplicateLayoutProperties_InvalidateTheDomainWithoutThrowing()
    {
        using var app = CreateApp("return 0;");
        app.Write(
            "ui/form/layouts/page.json",
            "{\"data\":{\"layout\":[{\"type\":\"Checkboxes\",\"dataModelBindings\":{\"simpleBinding\":\"selection\"},\"dataModelBindings\":{\"simpleBinding\":\"selection\"},\"optionsId\":\"choices\"}]}}"
        );
        Assert.Empty(LoadOptions(app));
    }

    private static IReadOnlyDictionary<string, IReadOnlyList<string>> LoadOptions(TempAppFolder app) =>
        CalculationInputOptions.Load(app.Root, Path.Combine(app.Root, "App/ui/form"), "model");

    private static TempAppFolder CreateApp(string body)
    {
        var app = CalculationExpressionMigrationTests.CreateApp();
        app.Write(
            "models/Root.cs",
            "namespace TestModels { public class Root { public decimal? a { get; set; } public decimal? b { get; set; } public decimal? result { get; set; } public string? selection { get; set; } } }"
        );
        app.Write("options/choices.json", "[{\"value\":\"0\"},{\"value\":\"1\"}]");
        app.Write(
            "ui/form/layouts/page.json",
            "{\"data\":{\"layout\":[{\"id\":\"choices\",\"type\":\"Checkboxes\",\"dataModelBindings\":{\"simpleBinding\":\"selection\"},\"optionsId\":\"choices\"}]}}"
        );
        app.Write(
            "ui/form/RuleConfiguration.json",
            "{\"data\":{\"ruleConnection\":{\"calculate\":{\"selectedFunction\":\"calculate\",\"inputParams\":{\"checkbox\":\"selection\",\"val0\":\"a\",\"val1\":\"b\"},\"outParams\":{\"outParam0\":\"result\"}}}}}"
        );
        app.Write("ui/form/RuleHandler.js", "var ruleHandlerObject = { calculate: function(obj) { " + body + " } };");
        return app;
    }
}
