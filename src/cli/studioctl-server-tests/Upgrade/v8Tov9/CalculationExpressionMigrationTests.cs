using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CalculationExpressionMigrationTests
{
    private const string Normalize = "obj.a = obj.a ? +obj.a : 0; obj.b = obj.b ? +obj.b : 0;";
    private const string Sum = Normalize + "return obj.a + obj.b;";

    [Theory]
    [InlineData(Sum, "{\"a\":2,\"b\":3}", 5)]
    [InlineData(Sum, "{\"a\":null,\"b\":-3}", -3)]
    [InlineData(Sum, "{}", 0)]
    [InlineData("return obj.a ? 1 : 0;", "{\"a\":-0}", 0)]
    [InlineData("if (obj.a == null) return 0; return obj.a === 0 ? 1 : 0;", "{\"a\":-0}", 1)]
    [InlineData("if (obj.a == null) return 0; return obj.a !== 0 ? 1 : 0;", "{\"a\":-0}", 0)]
    [InlineData("return obj.b ? +obj.b / +obj.b : 0;", "{\"b\":-0}", 0)]
    [InlineData("var undefined = 3; return undefined;", "{}", 3)]
    [InlineData("return (obj.a ?? 0) + (obj.b ?? 0);", "{}", 0)]
    [InlineData("return (obj.a ?? 0) + (obj.b ?? 0);", "{\"a\":2,\"b\":3}", 5)]
    [InlineData("return (obj.a || 0) + (obj.b || 0);", "{\"a\":0,\"b\":3}", 3)]
    [InlineData(Sum, "{\"a\":0.25,\"b\":-0.5}", -0.25)]
    [InlineData(
        Normalize + "var total = obj.a + obj.b; if (obj.a < 0) total = total * -1; return total;",
        "{\"a\":-10,\"b\":2}",
        8
    )]
    [InlineData(
        Normalize
            + "let total = obj.a + obj.b; const limit = 10; if (obj.a >= limit) return limit; return total; debugger;",
        "{\"a\":10,\"b\":2}",
        10
    )]
    [InlineData(Normalize + "if (obj.a > 0 && obj.b > 0) return obj.a / obj.b; return 0;", "{\"a\":6,\"b\":2}", 3)]
    [InlineData(Normalize + "if (obj.a > 0 && obj.b > 0) return obj.a / obj.b; return 0;", "{\"a\":6,\"b\":0}", 0)]
    [InlineData("return obj.b ? +obj.b / +obj.b : 0;", "{}", 0)]
    [InlineData("return obj.b ? +obj.b / +obj.b : 0;", "{\"b\":null}", 0)]
    [InlineData(
        "if (obj.a == null || obj.b == null) return 0; const factor = 2; return (obj.a + obj.b) * factor;",
        "{\"a\":3,\"b\":2}",
        10
    )]
    [InlineData(
        "if (obj.a == null || obj.b == null) return 0; const factor = 2; return (obj.a + obj.b) * factor;",
        "{}",
        0
    )]
    [InlineData(Normalize + "return obj.a || obj.b;", "{\"a\":0,\"b\":3}", 3)]
    [InlineData(Normalize + "return obj.a && obj.b;", "{\"a\":2,\"b\":3}", 3)]
    [InlineData("globalValue = obj.a; return globalValue;", "{\"a\":7}", 7)]
    [InlineData(
        "total = 0; if (obj.a) total += +obj.a; if (obj.b) total += +obj.b; return total;",
        "{\"a\":7,\"b\":3}",
        10
    )]
    [InlineData("if (obj.a) total = 7; else total = 3; return total;", "{}", 3)]
    [InlineData("if (!+obj.a || !+obj.b) return 0; return obj.a / obj.b;", "{\"a\":6,\"b\":2}", 3)]
    [InlineData("if (!+obj.a || !+obj.b) return 0; return obj.a / obj.b;", "{}", 0)]
    [InlineData(
        "const toNumber = value => { const num = Number(value); return isNaN(num) ? 0 : num; }; return toNumber(obj.a) + toNumber(obj.b);",
        "{\"a\":7}",
        7
    )]
    [InlineData(
        Normalize + "if (obj.b == 0) return 0; return Number((obj.a / obj.b).toFixed(1));",
        "{\"a\":100,\"b\":3}",
        33.3
    )]
    [InlineData(Normalize + "if (obj.b == 0) return 0; return Number((obj.a / obj.b).toFixed(1));", "{}", 0)]
    [InlineData(Normalize + "obj.extra = obj.extra ? +obj.extra : 0; return obj.a + obj.extra;", "{\"a\":2}", 2)]
    [InlineData(
        "if (obj.a === undefined || obj.b === undefined) return ''; return Number(obj.a) + Number(obj.b);",
        "{}",
        0
    )]
    [InlineData(
        "if (obj.a === undefined || obj.b === undefined) return ''; return Number(obj.a) + Number(obj.b);",
        "{\"a\":2,\"b\":3}",
        5
    )]
    [InlineData("return obj.a === null ? 7 : obj.a;", "{}", 7)]
    [InlineData("const twice = n => n * 2; return twice(twice(3));", "{}", 12)]
    public void ConvertedCalculations_PreserveAssignmentsBranchesAndMissingInputs(
        string body,
        string inputs,
        double expected
    )
    {
        using var app = CreateApp();
        var expression = Convert(app, body, Rule("calculate", "result"));
        var model = JsonNode.Parse(inputs)?.AsObject() ?? throw new InvalidOperationException();
        Assert.Equal(expected, Evaluate(expression, model));
    }

    [Theory]
    [InlineData("return null;")]
    [InlineData("if (obj.a) return obj.a;")]
    public void NullOrMissingReturn_IsPreserved(string body)
    {
        using var app = CreateApp();
        var expression = Convert(app, body, Rule("calculate", "result"));
        Assert.Null(Evaluate(expression, new JsonObject()));
    }

    [Theory]
    [InlineData("return Math.floor(obj.a);")]
    [InlineData("return obj.a.toFixed(2);")]
    [InlineData("return parseFloat(obj.a);")]
    [InlineData("return obj.a / obj.b;")]
    [InlineData("return obj.a > obj.b * 1.4 ? 1 : 0;")]
    [InlineData("return obj.a > obj.b * 24000 ? 1 : 0;")]
    [InlineData("return obj.a + obj.b === 0.3 ? 1 : 0;")]
    [InlineData("return obj.b ? (obj.a / obj.b < 0.4 ? 1 : 0) : 0;")]
    [InlineData("return obj.missing + 1;")]
    [InlineData("return obj.a === null;")]
    [InlineData("return obj.a ? 1 : 'value';")]
    [InlineData("const value = obj.a ? undefined : obj.b; return value === undefined ? 0 : 1;")]
    [InlineData("const value = obj.a ? undefined : obj.b; return value + 1;")]
    [InlineData("if (obj.a) globalValue = obj.a; return globalValue;")]
    [InlineData("globalValue += obj.a; return globalValue;")]
    [InlineData("const helper = value => { obj.a = value; return value; }; return helper(1);")]
    [InlineData("const helper = value => helper(value); return helper(1);")]
    [InlineData("const value = 1; value = 2; return value;")]
    [InlineData("if (obj.a) { let value = 1; } return value;")]
    [InlineData("for (var i = 0; i < 2; i++) obj.a++; return obj.a;")]
    [InlineData("return obj.text + 'x';")]
    [InlineData("return obj.text == null ? 0 : 1;")]
    [InlineData("return obj;")]
    public void UnsupportedSemantics_RequireFallback(string body)
    {
        using var app = CreateApp();
        var rule = Rule("calculate", "result");
        rule.InputParams?.Add("text", "text");
        Assert.Throws<NotSupportedException>(() => Convert(app, body, rule));
    }

    [Theory]
    [InlineData("async function(obj) { return 1; }")]
    [InlineData("function*(obj) { return 1; }")]
    public void AsyncAndGeneratorFunctions_DoNotBecomeExpressions(string function)
    {
        using var app = CreateApp();
        WriteRules(app, new() { ["calculate"] = Rule("calculate", "result") }, "calculate: " + function);
        Assert.Empty(CalculationMigration.Migrate(app.Root).ConvertedRules);
        Assert.False(File.Exists(CalculationPath(app)));
    }

    [Fact]
    public void ConstantStringConcatenation_PreservesTheStringResult()
    {
        using var app = CreateApp();
        var expression = Convert(app, "return 'hello' + ' world';", Rule("calculate", "text"));
        Assert.Equal("hello world", Evaluate(expression, new JsonObject()));
    }

    [Theory]
    [InlineData("{}", "0")]
    [InlineData("{\"a\":-0,\"b\":0}", "0")]
    [InlineData("{\"a\":7,\"b\":3}", "10")]
    public void NumericTextResults_PreserveTheStringModelType(string inputs, string expected)
    {
        using var app = CreateApp();
        app.Write("models/Root.cs", app.Read("models/Root.cs").Replace("decimal?", "int?", StringComparison.Ordinal));
        var expression = Convert(app, Normalize + "return (obj.a + obj.b).toString();", Rule("calculate", "text"));
        Assert.Equal(
            expected,
            Evaluate(expression, JsonNode.Parse(inputs)?.AsObject() ?? throw new InvalidOperationException())
        );
    }

    [Fact]
    public void FractionalNumericText_UsesCSharpToPreserveFloatingPointDigits()
    {
        using var app = CreateApp();
        Assert.Throws<NotSupportedException>(() =>
            Convert(app, Normalize + "return (obj.a + obj.b).toString();", Rule("calculate", "text"))
        );
    }

    [Fact]
    public void UnboundedIntegerText_UsesCSharpToPreserveJavaScriptFormatting()
    {
        using var app = CreateApp();
        app.Write("models/Root.cs", app.Read("models/Root.cs").Replace("decimal?", "long?", StringComparison.Ordinal));
        Assert.Throws<NotSupportedException>(() =>
            Convert(app, Normalize + "return (obj.a + obj.b).toString();", Rule("calculate", "text"))
        );
    }

    [Theory]
    [InlineData("return 'nu' + 'll';")]
    [InlineData("return (obj.a ? 'nu' : 'va') + 'll';")]
    public void ConcatenationThatCouldProduceReservedStrings_RequiresFallback(string body)
    {
        using var app = CreateApp();
        Assert.Throws<NotSupportedException>(() => Convert(app, body, Rule("calculate", "text")));
    }

    [Fact]
    public void IndependentRules_UseExpressionsAndExistingCSharpFallback()
    {
        using var app = CreateApp();
        WriteRules(
            app,
            new() { ["sum"] = Rule("sum", "result"), ["rounded"] = Rule("rounded", "other") },
            "sum: function(obj) { " + Sum + " }, rounded: function(obj) { return Math.floor(obj.a); }"
        );
        var migration = CalculationMigration.Migrate(app.Root);
        Assert.Equal("sum", Assert.Single(migration.ConvertedRules["form"]));
        var model = JsonNode.Parse("{\"a\":2,\"b\":3}")?.AsObject() ?? throw new InvalidOperationException();
        Assert.Equal(5d, Evaluate(Calculations(app)["result"]?["expression"], model));
        var handler = new RuleHandlerParser(Path.Combine(app.Root, "App", "ui", "form", "RuleHandler.js"));
        handler.Parse();
        var generated = new CSharpCodeGenerator(
            "form",
            Model(),
            new() { ["rounded"] = Rule("rounded", "other") },
            handler
        ).Generate();
        Assert.True(generated.Success);
        Assert.Equal(1, generated.SuccessfulConversions);
        Assert.Empty(generated.FailedRules);
    }

    [Fact]
    public void DependentUnsupportedRules_StayTogetherInCSharp()
    {
        using var app = CreateApp();
        var dependent = Rule("sum", "result");
        dependent.InputParams = new() { ["a"] = "other", ["b"] = "b" };
        WriteRules(
            app,
            new() { ["rounded"] = Rule("rounded", "other"), ["sum"] = dependent },
            "sum: function(obj) { " + Sum + " }, rounded: function(obj) { return Math.floor(obj.a); }"
        );
        Assert.Empty(CalculationMigration.Migrate(app.Root).ConvertedRules);
        Assert.False(File.Exists(CalculationPath(app)));
    }

    [Fact]
    public void UnsupportedMultipleOutputs_DoNotLeaveAnOverlappingExpressionWriter()
    {
        using var app = CreateApp();
        var multiple = Rule("sum", "other");
        multiple.OutParams?.Add("outParam1", "result");
        WriteRules(
            app,
            new() { ["multiple"] = multiple, ["sum"] = Rule("sum", "result") },
            "sum: function(obj) { " + Sum + " }"
        );
        Assert.Empty(CalculationMigration.Migrate(app.Root).ConvertedRules);
        Assert.False(File.Exists(CalculationPath(app)));
    }

    [Fact]
    public void ChainedCalculations_KeepExecutionOrderAndResumeWithoutChanges()
    {
        using var app = CreateApp();
        var dependent = Rule("sum", "other");
        dependent.InputParams = new() { ["a"] = "result", ["b"] = "b" };
        WriteRules(
            app,
            new() { ["first"] = Rule("sum", "result"), ["second"] = dependent },
            "sum: function(obj) { " + Sum + " }"
        );
        Assert.Equal(2, CalculationMigration.Migrate(app.Root).ConvertedRules["form"].Count);
        var first = File.ReadAllBytes(CalculationPath(app));
        var data = JsonNode.Parse("{\"a\":2,\"b\":3}")?.AsObject() ?? throw new InvalidOperationException();
        foreach (var (path, calculation) in Calculations(app))
            data[path] = JsonSerializer.SerializeToNode(Evaluate(calculation?["expression"], data));
        Assert.Equal(5, data["result"]?.GetValue<double>());
        Assert.Equal(8, data["other"]?.GetValue<double>());
        Assert.Equal(2, CalculationMigration.Migrate(app.Root).ConvertedRules["form"].Count);
        Assert.Equal(first, File.ReadAllBytes(CalculationPath(app)));
    }

    [Theory]
    [InlineData("rows[{0}].a", "rows[{0}].result", true)]
    [InlineData("a", "rows[{0}].result", true)]
    [InlineData("rows[1].a", "rows[1].result", true)]
    [InlineData("rows[{1}].a", "rows[{0}].result", false)]
    [InlineData("rows[{0}].a", "result", false)]
    public void RepeatingPaths_PreserveRowScope(string input, string output, bool supported)
    {
        using var app = CreateApp();
        var rule = Rule("sum", output);
        rule.InputParams = new() { ["a"] = input };
        WriteRules(app, new() { ["sum"] = rule }, "sum: function(obj) { " + Sum + " }");
        var result = CalculationMigration.Migrate(app.Root);
        Assert.Equal(supported, result.ConvertedRules.Count > 0);
        if (supported)
        {
            var target = output.Replace("[{0}]", "", StringComparison.Ordinal);
            var expression = Calculations(app)[target]?["expression"];
            Assert.Equal(
                2d,
                Evaluate(expression, new() { [input.Replace("[{0}]", "", StringComparison.Ordinal)] = 2 })
            );
        }
    }

    [Fact]
    public void IdenticalFixedRows_BecomeOneRepeatingCalculation()
    {
        using var app = CreateApp();
        var rules = new Dictionary<string, DataProcessingRule>();
        for (var index = 0; index < 7; index++)
        {
            var rule = Rule("sum", $"rows[{index}].result");
            rule.InputParams = new() { ["a"] = $"rows[{index}].a", ["b"] = $"rows[{index}].b" };
            rules[$"row{index}"] = rule;
        }
        WriteRules(app, rules, "sum: function(obj) { " + Sum + " }");
        Assert.Equal(7, CalculationMigration.Migrate(app.Root).ConvertedRules["form"].Count);
        var calculation = Assert.Single(Calculations(app));
        Assert.Equal("rows.result", calculation.Key);
        Assert.Equal(5d, Evaluate(calculation.Value?["expression"], new() { ["rows.a"] = 2, ["rows.b"] = 3 }));
        Assert.Equal(9d, Evaluate(calculation.Value?["expression"], new() { ["rows.a"] = 4, ["rows.b"] = 5 }));
        var before = File.ReadAllBytes(CalculationPath(app));
        Assert.Equal(7, CalculationMigration.Migrate(app.Root).ConvertedRules["form"].Count);
        Assert.Equal(before, File.ReadAllBytes(CalculationPath(app)));
    }

    [Theory]
    [InlineData("rows[0].rows[1].result", "rows[1].rows[1].result", "rows.rows[1].result")]
    [InlineData("rows[0].rows[0].result", "rows[1].rows[1].result", "rows.rows.result")]
    public void NestedFixedRows_OnlyGeneralizeVaryingIndices(
        string firstTarget,
        string secondTarget,
        string expectedTarget
    )
    {
        using var app = CreateApp();
        var first = Rule("sum", firstTarget);
        first.InputParams = new() { ["a"] = firstTarget.Replace(".result", ".a", StringComparison.Ordinal) };
        var second = Rule("sum", secondTarget);
        second.InputParams = new() { ["a"] = secondTarget.Replace(".result", ".a", StringComparison.Ordinal) };
        WriteRules(app, new() { ["first"] = first, ["second"] = second }, "sum: function(obj) { " + Sum + " }");
        Assert.Equal(2, CalculationMigration.Migrate(app.Root).ConvertedRules["form"].Count);
        var calculation = Assert.Single(Calculations(app));
        Assert.Equal(expectedTarget, calculation.Key);
        Assert.Equal(
            4d,
            Evaluate(
                calculation.Value?["expression"],
                new() { [expectedTarget.Replace(".result", ".a", StringComparison.Ordinal)] = 4 }
            )
        );
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void FixedRowsWithDifferentInputsOrFunctions_KeepTheirSpecificTargets(bool differentFunction)
    {
        using var app = CreateApp();
        var first = Rule("sum", "rows[0].result");
        first.InputParams = new() { ["a"] = "rows[0].a", ["b"] = "rows[0].b" };
        var second = Rule(differentFunction ? "subtract" : "sum", "rows[1].result");
        second.InputParams = new() { ["a"] = "rows[1].a", ["b"] = differentFunction ? "rows[1].b" : "b" };
        WriteRules(
            app,
            new() { ["first"] = first, ["second"] = second },
            "sum: function(obj) { " + Sum + " }, subtract: function(obj) { " + Normalize + "return obj.a - obj.b; }"
        );
        Assert.Equal(2, CalculationMigration.Migrate(app.Root).ConvertedRules["form"].Count);
        var calculations = Calculations(app);
        Assert.Equal(2, calculations.Count);
        Assert.Equal(
            5d,
            Evaluate(calculations["rows[0].result"]?["expression"], new() { ["rows[0].a"] = 2, ["rows[0].b"] = 3 })
        );
        Assert.Equal(
            differentFunction ? 3d : 7d,
            Evaluate(
                calculations["rows[1].result"]?["expression"],
                new()
                {
                    ["rows[1].a"] = 5,
                    ["rows[1].b"] = 2,
                    ["b"] = 2,
                }
            )
        );
    }

    [Fact]
    public void RulesReadingAnotherFixedRow_AreNotGeneralized()
    {
        using var app = CreateApp();
        var first = Rule("sum", "rows[0].result");
        first.InputParams = new() { ["a"] = "rows[1].a" };
        var second = Rule("sum", "rows[1].result");
        second.InputParams = new() { ["a"] = "rows[0].a" };
        WriteRules(app, new() { ["first"] = first, ["second"] = second }, "sum: function(obj) { " + Sum + " }");
        Assert.Equal(2, CalculationMigration.Migrate(app.Root).ConvertedRules["form"].Count);
        Assert.Equal(2, Calculations(app).Count);
        Assert.Equal(8d, Evaluate(Calculations(app)["rows[0].result"]?["expression"], new() { ["rows[1].a"] = 8 }));
    }

    [Theory]
    [InlineData("return Math.round(2.6);", "{}", 3)]
    [InlineData("return Math.round(1234567.4);", "{}", 1234567)]
    [InlineData("return Math.round(-2.6);", "{}", -3)]
    [InlineData("return Math.round(-2.5);", "{}", -2)]
    [InlineData("return Math.round(2.5);", "{}", 3)]
    [InlineData(Normalize + "return Number((obj.a + obj.b).toFixed(2));", "{}", 0)]
    [InlineData(Normalize + "return Number((obj.a + obj.b).toFixed(2));", "{\"a\":12.34,\"b\":5.67}", 18.01)]
    [InlineData(Normalize + "return Number((obj.a + obj.b).toFixed(2));", "{\"a\":12345.67,\"b\":0}", 12345.67)]
    [InlineData(Normalize + "return Math.round((obj.a + obj.b) * 100) / 100;", "{}", 0)]
    [InlineData(Normalize + "return Math.round((obj.a + obj.b) * 100) / 100;", "{\"a\":12.34,\"b\":5.67}", 18.01)]
    [InlineData(Normalize + "return Math.round((obj.a + obj.b) * 100) / 100;", "{\"a\":12345.67,\"b\":0}", 12345.67)]
    public void NumericRounding_UsesExpressionRoundingAndReturnsANumber(string body, string inputs, double expected)
    {
        using var app = CreateApp();
        var expression = Convert(app, body, Rule("calculate", "result"));
        var data = JsonNode.Parse(inputs)?.AsObject() ?? throw new InvalidOperationException();
        Assert.Equal(expected, Assert.IsType<double>(Evaluate(expression, data)), 8);
    }

    [Fact]
    public void DynamicMathRound_UsesCSharpToPreserveNegativeMidpoints()
    {
        using var app = CreateApp();
        Assert.Throws<NotSupportedException>(() =>
            Convert(app, Normalize + "return Math.round(obj.a + obj.b);", Rule("calculate", "result"))
        );
    }

    [Theory]
    [InlineData("return Math.round(obj.a * 10) / 100;")]
    [InlineData("return Math.round(obj.a * 99.99999999999999) / 99.99999999999999;")]
    public void DifferentOrNonDecimalRoundingScales_RequireFallback(string body)
    {
        using var app = CreateApp();
        Assert.Throws<NotSupportedException>(() => Convert(app, Normalize + body, Rule("calculate", "result")));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void NumericOptionCodes_ControlIncludedCostsAndPreserveTheirActualMultiplier(bool inlineOptions)
    {
        using var app = CreateApp();
        var component = new JsonObject
        {
            ["type"] = "RadioButtons",
            ["dataModelBindings"] = new JsonObject { ["simpleBinding"] = "text" },
        };
        var options = JsonNode.Parse("[{\"value\":\"0\"},{\"value\":\"1\"}]");
        if (inlineOptions)
            component["options"] = options;
        else
        {
            component["optionsId"] = "yes-no";
            app.Write("options/yes-no.json", options?.ToJsonString() ?? "[]");
        }
        app.Write(
            "ui/form/layouts/page.json",
            new JsonObject { ["data"] = new JsonObject { ["layout"] = new JsonArray(component) } }.ToJsonString()
        );
        var rule = Rule("cost", "result");
        rule.InputParams = new() { ["cost"] = "a", ["flag"] = "text" };
        WriteRules(
            app,
            new() { ["total"] = rule },
            "cost: function(obj) { obj.flag = obj.flag ? +obj.flag : 0; obj.cost = obj.cost ? +obj.cost : 0; return obj.cost * obj.flag; }"
        );
        Assert.Equal("total", Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]));
        var expression = Calculations(app)["result"]?["expression"];
        foreach (
            var (flag, expected) in new (string?, double)[]
            {
                (null, 0),
                ("", 0),
                ("0", 0),
                ("1", 100),
                ("2", 200),
                ("2.5", 250),
                ("-1", -100),
                ("+1", 100),
                (".5", 50),
            }
        )
            Assert.Equal(expected, Evaluate(expression, new() { ["a"] = 100, ["text"] = flag }));
        Assert.Equal(0d, Evaluate(expression, new() { ["a"] = 100 }));
        Assert.Equal(0d, Evaluate(expression, new() { ["text"] = "1" }));
    }

    [Theory]
    [InlineData("return obj.flag ? obj.flag + 1 : 0;")]
    [InlineData("return obj.flag ? obj.flag > '2' : false;")]
    public void NumericOptionMetadata_DoesNotChangeStringAdditionOrOrdering(string body)
    {
        using var app = CreateApp();
        app.Write(
            "ui/form/layouts/page.json",
            "{\"data\":{\"layout\":[{\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":\"text\"},\"options\":[{\"value\":\"1\"},{\"value\":\"10\"}]}]}}"
        );
        var rule = Rule("calculate", "result");
        rule.InputParams = new() { ["flag"] = "text" };
        WriteRules(app, new() { ["calculate"] = rule }, "calculate: function(obj) { " + body + " }");
        Assert.Empty(CalculationMigration.Migrate(app.Root).ConvertedRules);
    }

    [Theory]
    [InlineData(
        "[{\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":\"text\"},\"dataModelBindings\":{\"simpleBinding\":\"a\"},\"options\":[{\"value\":\"1\"}]}]"
    )]
    [InlineData(
        "[{\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":\"text\"},\"source\":{},\"options\":[{\"value\":\"1\"}]}]"
    )]
    [InlineData(
        "[{\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":\"text\"},\"optionsId\":\"also-set\",\"options\":[{\"value\":\"1\"}]}]"
    )]
    [InlineData(
        "[{\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":\"text\"},\"optionsId\":\"dynamic\"}]"
    )]
    [InlineData(
        "[{\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":\"text\"},\"options\":[{\"value\":\"1\"},{\"value\":\"other\"}]}]"
    )]
    [InlineData(
        "[{\"type\":\"Checkboxes\",\"dataModelBindings\":{\"simpleBinding\":\"text\"},\"options\":[{\"value\":\"0\"},{\"value\":\"1\"}]}]"
    )]
    [InlineData(
        "[{\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":\"text\"},\"options\":[{\"value\":\"0\"},{\"value\":\"1\"}]},{\"type\":\"Input\",\"dataModelBindings\":{\"simpleBinding\":\"text\"}}]"
    )]
    [InlineData(
        "[{\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":{\"field\":\"text\",\"dataType\":\"otherModel\"}},\"options\":[{\"value\":\"0\"},{\"value\":\"1\"}]}]"
    )]
    public void UnknownOrNonnumericOptionSources_KeepNumericCoercionInCSharp(string components)
    {
        using var app = CreateApp();
        app.Write("ui/form/layouts/page.json", "{\"data\":{\"layout\":" + components + "}}");
        var rule = Rule("calculate", "result");
        rule.InputParams = new() { ["flag"] = "text" };
        WriteRules(
            app,
            new() { ["calculate"] = rule },
            "calculate: function(obj) { return obj.flag ? +obj.flag : 0; }"
        );
        Assert.Empty(CalculationMigration.Migrate(app.Root).ConvertedRules);
    }

    [Fact]
    public void NullableCalculatedOutputs_AlignTheSchemaWithTheCSharpModel()
    {
        using var app = CreateApp();
        app.Write(
            "models/model.schema.json",
            "{\"type\":\"object\",\"properties\":{\"result\":{\"type\":\"number\",\"minimum\":0},\"other\":{\"type\":\"number\"}}}"
        );
        WriteRules(
            app,
            new() { ["optional"] = Rule("optional", "result") },
            "optional: function(obj) { " + Normalize + " if(obj.a > 0) return obj.b; return null; }"
        );
        Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]);
        var schema = JsonNode.Parse(app.Read("models/model.schema.json"));
        Assert.Equal("[\"number\",\"null\"]", schema?["properties"]?["result"]?["type"]?.ToJsonString());
        Assert.Equal(0, schema?["properties"]?["result"]?["minimum"]?.GetValue<int>());
        Assert.Equal("number", schema?["properties"]?["other"]?["type"]?.GetValue<string>());
        var before = app.Read("models/model.schema.json");
        CalculationMigration.Migrate(app.Root);
        Assert.Equal(before, app.Read("models/model.schema.json"));
    }

    [Fact]
    public void NullableSchemaReferences_AreWrappedWithoutChangingSharedDefinitions()
    {
        using var app = CreateApp();
        app.Write(
            "models/model.schema.json",
            "{\"type\":\"object\",\"$defs\":{\"amount\":{\"type\":\"number\"}},\"properties\":{\"result\":{\"$ref\":\"#/$defs/amount\"},\"other\":{\"$ref\":\"#/$defs/amount\"}}}"
        );
        WriteRules(
            app,
            new() { ["optional"] = Rule("optional", "result") },
            "optional: function(obj) { " + Normalize + " if(obj.a > 0) return obj.b; return null; }"
        );
        Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]);
        var schema = JsonNode.Parse(app.Read("models/model.schema.json"));
        Assert.Equal("null", schema?["properties"]?["result"]?["oneOf"]?[1]?["type"]?.GetValue<string>());
        Assert.Equal("number", schema?["$defs"]?["amount"]?["type"]?.GetValue<string>());
        Assert.Equal("#/$defs/amount", schema?["properties"]?["other"]?["$ref"]?.GetValue<string>());
    }

    [Fact]
    public void NullableRepeatingOutput_ResolvesArraysAndLocalReferences()
    {
        using var app = CreateApp();
        app.Write(
            "models/model.schema.json",
            "{\"type\":\"object\",\"$defs\":{\"row\":{\"type\":\"object\",\"properties\":{\"result\":{\"type\":\"number\"}}}},\"properties\":{\"rows\":{\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/row\"}}}}"
        );
        WriteRules(
            app,
            new() { ["optional"] = Rule("optional", "rows[{0}].result") },
            "optional: function(obj) { return null; }"
        );
        Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]);
        var schema = JsonNode.Parse(app.Read("models/model.schema.json"));
        Assert.Equal(
            "[\"number\",\"null\"]",
            schema?["$defs"]?["row"]?["properties"]?["result"]?["type"]?.ToJsonString()
        );
    }

    [Fact]
    public void NullableOutput_PreservesTheOriginalEnumConstraints()
    {
        using var app = CreateApp();
        app.Write("models/model.schema.json", "{\"properties\":{\"result\":{\"type\":\"number\",\"enum\":[0,1]}}}");
        WriteRules(
            app,
            new() { ["optional"] = Rule("optional", "result") },
            "optional: function(obj) { return null; }"
        );
        Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]);
        var schema = JsonNode.Parse(app.Read("models/model.schema.json"));
        Assert.Equal("[0,1]", schema?["properties"]?["result"]?["oneOf"]?[0]?["enum"]?.ToJsonString());
        Assert.Equal("null", schema?["properties"]?["result"]?["oneOf"]?[1]?["type"]?.GetValue<string>());
        var before = app.Read("models/model.schema.json");
        CalculationMigration.Migrate(app.Root);
        Assert.Equal(before, app.Read("models/model.schema.json"));
    }

    [Theory]
    [InlineData("{\"type\":\"number\"}", "return 1;")]
    [InlineData("{\"type\":[\"number\",\"null\"]}", "return null;")]
    [InlineData("{\"oneOf\":[{\"type\":\"number\"},{\"$ref\":\"#/$defs/empty\"}]}", "return null;")]
    public void UnnecessarySchemaUpdates_AreAvoided(string property, string body)
    {
        using var app = CreateApp();
        var schema = "{\"$defs\":{\"empty\":{\"type\":\"null\"}},\"properties\":{\"result\":" + property + "}}";
        app.Write("models/model.schema.json", schema);
        WriteRules(
            app,
            new() { ["optional"] = Rule("optional", "result") },
            "optional: function(obj) { " + body + " }"
        );
        Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]);
        Assert.Equal(schema, app.Read("models/model.schema.json"));
    }

    [Fact]
    public void RejectedCalculations_LeaveTheSchemaUnchanged()
    {
        using var app = CreateApp();
        const string schema = "{\"type\":\"object\",\"properties\":{\"result\":{\"type\":\"number\"}}}";
        app.Write("models/model.schema.json", schema);
        WriteRules(
            app,
            new() { ["first"] = Rule("optional", "result"), ["second"] = Rule("sum", "result") },
            "optional: function(obj) { return null; }, sum: function(obj) { " + Sum + " }"
        );
        Assert.Empty(CalculationMigration.Migrate(app.Root).ConvertedRules);
        Assert.Equal(schema, app.Read("models/model.schema.json"));
    }

    [Fact]
    public void UnresolvedNullableSchemaOutput_UsesCSharpFallback()
    {
        using var app = CreateApp();
        app.Write("models/model.schema.json", "{\"type\":\"object\",\"properties\":{}}");
        WriteRules(
            app,
            new() { ["optional"] = Rule("optional", "result") },
            "optional: function(obj) { return null; }"
        );
        Assert.Empty(CalculationMigration.Migrate(app.Root).ConvertedRules);
        Assert.False(File.Exists(CalculationPath(app)));
    }

    [Theory]
    [InlineData("duplicate")]
    [InlineData("self")]
    [InlineData("backwards")]
    [InlineData("cross-layout")]
    public void ConflictingCalculations_StayInCSharp(string scenario)
    {
        using var app = CreateApp();
        var first = Rule("sum", "result");
        var second = Rule("sum", scenario == "duplicate" ? "result" : "other");
        if (scenario is "self" or "backwards")
            first.InputParams = new() { ["a"] = scenario == "self" ? "result" : "other" };
        if (scenario == "cross-layout")
            second.InputParams = new() { ["a"] = "result" };
        WriteRules(app, new() { ["first"] = first }, "sum: function(obj) { " + Sum + " }");
        if (scenario == "cross-layout")
        {
            WriteRules(app, new() { ["second"] = second }, "sum: function(obj) { " + Sum + " }", "otherForm");
            app.Write(
                "ui/layout-sets.json",
                "{\"sets\":[{\"id\":\"form\",\"dataType\":\"model\"},{\"id\":\"otherForm\",\"dataType\":\"model\"}]}"
            );
        }
        else
            WriteRules(app, new() { ["first"] = first, ["second"] = second }, "sum: function(obj) { " + Sum + " }");
        var result = CalculationMigration.Migrate(app.Root);
        if (scenario == "self")
            Assert.Equal("second", Assert.Single(result.ConvertedRules["form"]));
        else
            Assert.Empty(result.ConvertedRules);
    }

    [Fact]
    public void ExistingCalculationFile_IsPreservedAndConflictsRequireManualWork()
    {
        using var app = CreateApp();
        app.Write(
            "models/model.calculation.json",
            "{\"$schema\":\"existing-schema\",\"custom\":42,\"calculations\":{\"other\":{\"expression\":7}}}"
        );
        WriteRules(app, new() { ["sum"] = Rule("sum", "result") }, "sum: function(obj) { " + Sum + " }");
        Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]);
        var document = JsonNode.Parse(app.Read("models/model.calculation.json"));
        Assert.Equal("existing-schema", document?["$schema"]?.GetValue<string>());
        Assert.Equal(42, document?["custom"]?.GetValue<int>());
        Assert.Equal(7, document?["calculations"]?["other"]?["expression"]?.GetValue<int>());
        WriteRules(app, new() { ["sum"] = Rule("sum", "other") }, "sum: function(obj) { " + Sum + " }");
        var before = File.ReadAllBytes(CalculationPath(app));
        var conflict = CalculationMigration.Migrate(app.Root);
        Assert.Empty(conflict.ConvertedRules);
        Assert.Equal("sum", Assert.Single(conflict.ManualRules["form"]));
        Assert.Equal(before, File.ReadAllBytes(CalculationPath(app)));
    }

    [Theory]
    [InlineData("\"result\"")]
    [InlineData("target")]
    public void ExistingProcessorAndMatchingExpression_RequireManualConflictResolution(string target)
    {
        using var app = CreateApp();
        WriteRules(app, new() { ["sum"] = Rule("sum", "result") }, "sum: function(obj) { " + Sum + " }");
        Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]);
        app.Write(
            "logic/ConvertedLegacyRules/FormDataProcessor.cs",
            "class FormDataProcessor { void Calculate(dynamic wrapper, string target) { wrapper.Set("
                + target
                + ", 5); } }"
        );
        var before = File.ReadAllBytes(CalculationPath(app));
        var migration = CalculationMigration.Migrate(app.Root);
        Assert.Empty(migration.ConvertedRules);
        Assert.Equal("sum", Assert.Single(migration.ManualRules["form"]));
        Assert.Equal(before, File.ReadAllBytes(CalculationPath(app)));
    }

    [Fact]
    public void ExistingExpressionWithNewUnsupportedDependency_KeepsConnectedRulesForManualMigration()
    {
        using var app = CreateApp();
        WriteRules(app, new() { ["sum"] = Rule("sum", "result") }, "sum: function(obj) { " + Sum + " }");
        Assert.Single(CalculationMigration.Migrate(app.Root).ConvertedRules["form"]);
        var dependent = Rule("rounded", "other");
        dependent.InputParams = new() { ["a"] = "result" };
        WriteRules(
            app,
            new() { ["sum"] = Rule("sum", "result"), ["rounded"] = dependent },
            "sum: function(obj) { " + Sum + " }, rounded: function(obj) { return Math.floor(obj.a); }"
        );
        var before = File.ReadAllBytes(CalculationPath(app));
        var migration = CalculationMigration.Migrate(app.Root);
        Assert.Empty(migration.ConvertedRules);
        Assert.Equal(2, migration.ManualRules["form"].Count);
        Assert.Equal(before, File.ReadAllBytes(CalculationPath(app)));
    }

    [Fact]
    public async Task UpgradePipeline_WritesExpressionsAndOnlyRegistersResidualProcessor()
    {
        using var app = CreateApp();
        WriteRules(
            app,
            new() { ["sum"] = Rule("sum", "result"), ["rounded"] = Rule("rounded", "other") },
            "sum: function(obj) { " + Sum + " }, rounded: function(obj) { return Math.floor(obj.a); }"
        );
        app.CommitEverything();
        var report = new UpgradeReport();
        await V8Tov9Upgrade.RunAsync(
            new(
                app.Root,
                "App/App.csproj",
                9,
                "net10.0",
                true,
                false,
                null,
                report,
                new StringWriter(),
                TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );
        Assert.Equal(5d, Evaluate(Calculations(app)["result"]?["expression"], new() { ["a"] = 2, ["b"] = 3 }));
        var processor = app.Read("logic/ConvertedLegacyRules/FormDataProcessor.cs");
        Assert.Contains("wrapper.Set(\"other\"", processor);
        Assert.DoesNotContain("wrapper.Set(\"result\"", processor);
        Assert.Contains("AddTransient<IDataProcessor, FormDataProcessor>", app.Read("Program.cs"));
        Assert.False(File.Exists(Path.Combine(app.Root, "App/ui/form/RuleHandler.js")));
    }

    [Fact]
    public void CollectionValues_AreNotTreatedAsScalarNumbers()
    {
        using var app = CreateApp();
        var rule = Rule("calculate", "result");
        rule.InputParams = new() { ["a"] = "numbers" };
        Assert.Throws<NotSupportedException>(() => Convert(app, "return obj.a ? +obj.a : 0;", rule));
    }

    [Fact]
    public void RepeatingScalarNullOutput_DoesNotClearTheEntireCollection()
    {
        using var app = CreateApp();
        WriteRules(app, new() { ["clear"] = Rule("clear", "numbers[{0}]") }, "clear: function(obj) { return null; }");
        Assert.Empty(CalculationMigration.Migrate(app.Root).ConvertedRules);
        Assert.False(File.Exists(CalculationPath(app)));
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("{\"calculations\":[]}")]
    public void InvalidExistingCalculationFile_IsPreservedAndRequiresManualWork(string content)
    {
        using var app = CreateApp();
        app.Write("models/model.calculation.json", content);
        WriteRules(app, new() { ["sum"] = Rule("sum", "result") }, "sum: function(obj) { " + Sum + " }");
        var migration = CalculationMigration.Migrate(app.Root);
        Assert.Empty(migration.ConvertedRules);
        Assert.Equal("sum", Assert.Single(migration.ManualRules["form"]));
        Assert.Equal(content, File.ReadAllText(CalculationPath(app)));
    }

    [Fact]
    public async Task ExpressionOnlyUpgrade_DoesNotRegisterADataProcessor()
    {
        using var app = CreateApp();
        WriteRules(app, new() { ["sum"] = Rule("sum", "result") }, "sum: function(obj) { " + Sum + " }");
        app.CommitEverything();
        await RunUpgrade(app);
        Assert.Equal(5d, Evaluate(Calculations(app)["result"]?["expression"], new() { ["a"] = 2, ["b"] = 3 }));
        Assert.False(Directory.Exists(Path.Combine(app.Root, "App/logic/ConvertedLegacyRules")));
        Assert.DoesNotContain("FormDataProcessor", app.Read("Program.cs"));
        Assert.False(File.Exists(Path.Combine(app.Root, "App/ui/form/RuleConfiguration.json")));
    }

    [Fact]
    public async Task ResumedUpgrade_KeepsExpressionsSeparateFromResidualCSharp()
    {
        using var app = CreateApp();
        WriteRules(
            app,
            new() { ["sum"] = Rule("sum", "result"), ["rounded"] = Rule("rounded", "other") },
            "sum: function(obj) { " + Sum + " }, rounded: function(obj) { return Math.floor(obj.a); }"
        );
        // An unrelated conditional cannot be converted, so the legacy calculation files remain.
        var configuration = JsonNode.Parse(app.Read("ui/form/RuleConfiguration.json"));
        if (configuration?["data"] is not JsonObject data)
            throw new InvalidOperationException();
        data["conditionalRendering"] = JsonNode.Parse(
            "{\"keep\":{\"selectedFunction\":\"unsupported\",\"selectedAction\":\"Hide\",\"selectedFields\":{\"target\":\"target\"}}}"
        );
        app.Write("ui/form/RuleConfiguration.json", configuration.ToJsonString());
        app.Write(
            "ui/form/layouts/page.json",
            "{\"data\":{\"layout\":[{\"id\":\"target\",\"type\":\"Input\",\"dataModelBindings\":{\"simpleBinding\":\"a\"}}]}}"
        );
        app.Write(
            "ui/form/RuleHandler.js",
            app.Read("ui/form/RuleHandler.js")
                + "var conditionalRuleHandlerObject = { unsupported: function(obj) { return new Date(); } };"
        );
        app.CommitEverything();
        await RunUpgrade(app);
        Assert.True(File.Exists(Path.Combine(app.Root, "App/ui/form/RuleConfiguration.json")));
        var first = await File.ReadAllBytesAsync(CalculationPath(app), TestContext.Current.CancellationToken);
        await RunUpgrade(app);
        Assert.Equal(first, await File.ReadAllBytesAsync(CalculationPath(app), TestContext.Current.CancellationToken));
        var processor = app.Read("logic/ConvertedLegacyRules/FormDataProcessor.cs");
        Assert.Contains("wrapper.Set(\"other\"", processor);
        Assert.DoesNotContain("wrapper.Set(\"result\"", processor);
    }

    private static Task<int> RunUpgrade(TempAppFolder app) =>
        V8Tov9Upgrade.RunAsync(
            new(
                app.Root,
                "App/App.csproj",
                9,
                "net10.0",
                true,
                false,
                null,
                new UpgradeReport(),
                new StringWriter(),
                TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

    internal static TempAppFolder CreateApp()
    {
        var app = new TempAppFolder();
        app.Write(
            "App.csproj",
            "<Project Sdk=\"Microsoft.NET.Sdk.Web\"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"8.8.0\" /></ItemGroup></Project>"
        );
        app.Write(
            "Program.cs",
            "using Altinn.App.Core.Features;\nvar builder = WebApplication.CreateBuilder(args);\nRegisterCustomAppServices(builder.Services);\nstatic void RegisterCustomAppServices(IServiceCollection services) { services.AddControllers(); }\n"
        );
        app.Write(
            "ui/layout-sets.json",
            "{\"sets\":[{\"id\":\"form\",\"dataType\":\"model\",\"tasks\":[\"Task_1\"]}]}"
        );
        app.Write("ui/form/layouts/page.json", "{\"data\":{\"layout\":[]}}");
        app.Write(
            "config/applicationmetadata.json",
            "{\"dataTypes\":[{\"id\":\"model\",\"appLogic\":{\"classRef\":\"TestModels.Root\"}}]}"
        );
        app.Write(
            "models/Root.cs",
            "namespace TestModels { public class Root { public decimal? a { get; set; } public decimal? b { get; set; } public decimal? result { get; set; } public decimal? other { get; set; } public string? text { get; set; } public System.Collections.Generic.List<decimal> numbers { get; set; } = []; public System.Collections.Generic.List<Root> rows { get; set; } = []; } }"
        );
        return app;
    }

    private static DataModelInfo Model() =>
        new()
        {
            DataType = "model",
            FullClassRef = "TestModels.Root",
            ClassName = "Root",
            Namespace = "TestModels",
        };

    private static DataProcessingRule Rule(string function, string target) =>
        new()
        {
            SelectedFunction = function,
            InputParams = new() { ["a"] = "a", ["b"] = "b" },
            OutParams = new() { ["outParam0"] = target },
        };

    private static string CalculationPath(TempAppFolder app) =>
        Path.Combine(app.Root, "App/models/model.calculation.json");

    private static JsonObject Calculations(TempAppFolder app) =>
        JsonNode.Parse(File.ReadAllText(CalculationPath(app)))?["calculations"]?.AsObject()
        ?? throw new InvalidOperationException();

    private static void WriteRules(
        TempAppFolder app,
        Dictionary<string, DataProcessingRule> rules,
        string functions,
        string layout = "form"
    )
    {
        app.Write(
            $"ui/{layout}/RuleConfiguration.json",
            JsonSerializer.Serialize(new { data = new { ruleConnection = rules } })
        );
        app.Write($"ui/{layout}/RuleHandler.js", "var ruleHandlerObject = { " + functions + " }; ");
    }

    private static JsonNode? Convert(TempAppFolder app, string body, DataProcessingRule rule)
    {
        var parser = new RuleHandlerParser(
            app.Write(
                "ui/form/RuleHandler.js",
                "var ruleHandlerObject = { calculate: function(obj) { " + body + " } };"
            )
        );
        parser.Parse();
        var types = new DataModelTypeResolver(app.Root);
        Assert.True(types.LoadDataModelType(Model()));
        return new CalculationExpressionConverter().Convert(
            parser.GetDataProcessingFunction("calculate") ?? throw new InvalidOperationException(),
            rule,
            types,
            "model"
        );
    }

    // Reference evaluation of the emitted language, deliberately eager like the runtime. This
    // catches invalid inactive branches; corpus experiments also use the actual app evaluators.
    private static object? Evaluate(JsonNode? expression, JsonObject data)
    {
        if (expression is not JsonArray call)
            return expression?.GetValueKind() switch
            {
                JsonValueKind.Number => double.Parse(
                    expression.ToJsonString(),
                    System.Globalization.CultureInfo.InvariantCulture
                ),
                JsonValueKind.String => expression.GetValue<string>(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                _ => null,
            };
        var name = call[0]?.GetValue<string>();
        if (name == "dataModel")
            return Evaluate(data[call[1]?.GetValue<string>() ?? ""], data);
        var args = call.Skip(1).Select(argument => Evaluate(argument, data)).ToArray();
        if (name == "if" && (args.Length != 4 || args[2] is not "else"))
            throw new InvalidOperationException("Expected the expression language's if/else syntax.");
        double Number(int index) =>
            System.Convert.ToDouble(args[index], System.Globalization.CultureInfo.InvariantCulture);
        return name switch
        {
            "if" => args[0] is true ? args[1] : args[3],
            "and" => args.All(argument => argument is true),
            "or" => args.Any(argument => argument is true),
            "not" => args[0] is not true,
            "equals" => Equals(args[0], args[1]),
            "notEquals" => !Equals(args[0], args[1]),
            "greaterThan" => args[0] != null && args[1] != null && Number(0) > Number(1),
            "lessThan" => args[0] != null && args[1] != null && Number(0) < Number(1),
            "greaterThanEq" => args[0] != null && args[1] != null && Number(0) >= Number(1),
            "lessThanEq" => args[0] != null && args[1] != null && Number(0) <= Number(1),
            "plus" => args.Select((_, index) => Number(index)).Sum(),
            "minus" => Number(0) - Number(1),
            "multiply" => Number(0) * Number(1),
            "divide" => Number(1) == 0 ? throw new DivideByZeroException() : Number(0) / Number(1),
            "round" => Number(0).ToString($"N{(int)Number(1)}", System.Globalization.CultureInfo.InvariantCulture),
            "concat" => string.Concat(args),
            "stringReplace" => (args[0] as string)?.Replace(
                args[1] as string ?? "",
                args[2] as string ?? "",
                StringComparison.Ordinal
            ),
            "jmespath" when args[1] is "to_number(@)" => double.TryParse(
                args[0] as string,
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture,
                out var parsed
            )
                ? parsed
                : null,
            _ => throw new NotSupportedException(name),
        };
    }
}
