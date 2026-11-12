using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingRules;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ConditionalExpressionConversionTests
{
    private static readonly string[] s_yesNoOptions = ["yes", "no"];

    [Theory]
    [InlineData("function(values) { return values.answer === 'yes'; }")]
    [InlineData("values => values['answer'] === 'yes'")]
    [InlineData("function(values) { const { answer: chosen } = values; return chosen === 'yes'; }")]
    [InlineData("function(values) { const chosen = values.answer; return chosen === 'yes'; }")]
    public void ParameterNamesAndLocalAliases_PreserveTheConfiguredBinding(string function)
    {
        var converted = Convert(function);
        AssertExpression("[\"equals\",[\"dataModel\",\"choice\"],\"yes\"]", converted);
    }

    [Fact]
    public void ShowRule_InvertsTheCompletedPredicateOnce()
    {
        var converted = Convert("function(values) { if (values.answer === 'yes') return true; return false; }", "Show");
        AssertExpression("[\"not\",[\"equals\",[\"dataModel\",\"choice\"],\"yes\"]]", converted);
    }

    [Fact]
    public void LocalAssignments_AreNotSilentlyDiscarded()
    {
        var converted = Convert(
            "function(values) { let hidden = false; if (values.answer === 'yes') hidden = true; return hidden; }"
        );
        AssertExpression("[\"equals\",[\"dataModel\",\"choice\"],\"yes\"]", converted);
    }

    [Fact]
    public void BranchWithoutReturn_ContinuesWithTheRemainingStatements()
    {
        var converted = Convert(
            "function(values) { if (values.answer === 'yes') { if (values.answer === 'no') return false; } return true; }"
        );
        AssertExpression(
            "[\"if\",[\"equals\",[\"dataModel\",\"choice\"],\"yes\"],[\"not\",[\"equals\",[\"dataModel\",\"choice\"],\"no\"]],\"else\",true]",
            converted
        );
    }

    [Fact]
    public void AssigningAnInputProperty_ChangesSubsequentReads()
    {
        var converted = Convert("function(values) { values.answer = 'no'; return values.answer === 'no'; }");
        AssertExpression("[\"equals\",\"no\",\"no\"]", converted);
    }

    [Fact]
    public void ObjectAliases_ObserveWritesWhileScalarAliasesKeepTheirSnapshot()
    {
        AssertExpression(
            "[\"equals\",\"no\",\"no\"]",
            Convert("function(values) { const alias = values; values.answer = 'no'; return alias.answer === 'no'; }")
        );
        AssertExpression(
            "[\"equals\",[\"dataModel\",\"choice\"],\"yes\"]",
            Convert(
                "function(values) { const earlier = values.answer; values.answer = 'no'; return earlier === 'yes'; }"
            )
        );
    }

    [Fact]
    public void RepeatedSubstitution_DoesNotExpandAnUnboundedExpression()
    {
        var assignments = string.Concat(Enumerable.Repeat("result = result || result;", 30));
        var result = Convert("function(values) { let result = values.answer; " + assignments + " return result; }");
        Assert.Equal(ConversionStatus.Failed, result.Status);
        Assert.Contains("size limit", result.FailureReason);
    }

    [Theory]
    [InlineData("function(values) { let x = sideEffect(); return true; }")]
    [InlineData("function(values) { sideEffect(); return true; }")]
    [InlineData("function(values) { leaked = true; return leaked; }")]
    [InlineData("function(values) { while (values.answer) {} return true; }")]
    [InlineData("function(values) { let hidden; if (values.answer === 'yes') hidden = true; return hidden; }")]
    [InlineData("function(values) { return values[values.answer] === 'yes'; }")]
    [InlineData("async function(values) { return true; }")]
    [InlineData("function*(values) { return true; }")]
    public void UnsupportedEffectsOrControlFlow_DoNotBecomeSuccessfulConversions(string function)
    {
        Assert.Equal(ConversionStatus.Failed, Convert(function).Status);
    }

    [Theory]
    [InlineData("function(values) { return !values.answer; }")]
    [InlineData("function(values) { return values.answer == null; }")]
    [InlineData("function(values) { return values.answer === 'null'; }")]
    [InlineData("function(values) { return values.answer.includes('x'); }")]
    [InlineData("function(values) { return values.answer.length === 4; }")]
    public void UnrestrictedStrings_DoNotLoseReservedTextValues(string function)
    {
        Assert.Equal(ConversionStatus.Failed, Convert(function).Status);
    }

    [Fact]
    public void UnrestrictedStringNullCheck_IsNotSilentlyConverted()
    {
        Assert.Equal(ConversionStatus.Failed, Convert("function(values) { return values.answer === null; }").Status);
    }

    [Fact]
    public void ConfiguredInputs_AreNeverUndefinedAfterLegacyBinding()
    {
        AssertExpression("false", Convert("function(values) { return values.answer === undefined; }"));
        AssertExpression("false", Convert("function(values) { return typeof values.answer === 'undefined'; }"));
    }

    [Theory]
    [InlineData("typeof values.answer === 'number'", "[\"notEquals\",[\"dataModel\",\"choice\"],null]")]
    [InlineData("typeof values.answer === 'object'", "[\"equals\",[\"dataModel\",\"choice\"],null]")]
    [InlineData("typeof values.unmapped === 'undefined'", "true")]
    public void NumericTypeChecks_PreserveTheNullAndUnconfiguredCases(string predicate, string expected)
    {
        var converted = new ExpressionConverter().Convert(
            "function(values) { return " + predicate + "; }",
            new() { ["answer"] = "choice" },
            "Hide",
            new Dictionary<string, string> { ["answer"] = "number" }
        );
        AssertExpression(expected, converted);
    }

    [Fact]
    public void NumericEquality_UsesNumericComparisonAndPreservesZero()
    {
        var converter = new ExpressionConverter();
        var converted = converter.Convert(
            "function(values) { return values.answer == '01'; }",
            new() { ["answer"] = "choice" },
            "Hide",
            new Dictionary<string, string> { ["answer"] = "number" }
        );
        AssertExpression(
            "[\"and\",[\"greaterThanEq\",[\"dataModel\",\"choice\"],1],[\"lessThanEq\",[\"dataModel\",\"choice\"],1]]",
            converted
        );
    }

    [Theory]
    [InlineData("0x10")]
    [InlineData("0b10")]
    [InlineData("0o10")]
    [InlineData("Infinity")]
    public void UnsupportedNumericStringCoercion_DoesNotBecomeConstantFalse(string literal)
    {
        var converted = new ExpressionConverter().Convert(
            "function(values) { return values.answer == '" + literal + "'; }",
            new() { ["answer"] = "choice" },
            "Hide",
            new Dictionary<string, string> { ["answer"] = "number" }
        );
        Assert.Equal(ConversionStatus.Failed, converted.Status);
    }

    [Fact]
    public void StrictMixedTypes_RemainUnequal()
    {
        var converter = new ExpressionConverter();
        var converted = converter.Convert(
            "function(values) { return values.answer === '1'; }",
            new() { ["answer"] = "choice" },
            "Hide",
            new Dictionary<string, string> { ["answer"] = "number" }
        );
        AssertExpression("false", converted);
    }

    [Theory]
    [InlineData(
        "function(values) { return values.answer.indexOf('yes') > -1; }",
        "[\"contains\",[\"dataModel\",\"choice\"],\"yes\"]"
    )]
    [InlineData(
        "function(values) { return -1 < values.answer.indexOf('yes'); }",
        "[\"contains\",[\"dataModel\",\"choice\"],\"yes\"]"
    )]
    [InlineData("function(values) { return -1 > values.answer.indexOf('yes'); }", "false")]
    [InlineData(
        "function(values) { return values.answer.indexOf('yes') <= -1; }",
        "[\"not\",[\"contains\",[\"dataModel\",\"choice\"],\"yes\"]]"
    )]
    [InlineData("function(values) { return values.answer.indexOf('yes') >= -1; }", "true")]
    public void IndexOfComparison_PreservesTheOperatorAndOperandOrder(string function, string expected)
    {
        var converted = new ExpressionConverter().Convert(
            function,
            new() { ["answer"] = "choice" },
            "Hide",
            new Dictionary<string, string> { ["answer"] = "string" },
            new Dictionary<string, IReadOnlyList<string>> { ["answer"] = s_yesNoOptions }
        );
        AssertExpression(expected, converted);
    }

    [Theory]
    [InlineData("return values.answer.includes('yes', 2);")]
    [InlineData("return values.answer.indexOf('yes', 2) !== -1;")]
    public void StringSearchStartingPositions_RequireManualConversion(string body)
    {
        Assert.Equal(ConversionStatus.Failed, Convert("function(values) { " + body + " }").Status);
    }

    [Theory]
    [InlineData("values.answer.includes('Null')")]
    [InlineData("values.answer.includes(true)")]
    [InlineData("values.answer.indexOf('True') !== -1")]
    public void SearchArguments_DoNotSilentlyChangeTypeOrReservedValueCasing(string predicate)
    {
        var converted = new ExpressionConverter().Convert(
            "function(values) { return " + predicate + "; }",
            new() { ["answer"] = "choice" },
            "Hide",
            new Dictionary<string, string> { ["answer"] = "string" },
            new Dictionary<string, IReadOnlyList<string>> { ["answer"] = s_yesNoOptions }
        );
        Assert.Equal(ConversionStatus.Failed, converted.Status);
    }

    [Fact]
    public void HelperBody_IsParsedAndItsParameterIsRebound()
    {
        using var app = new TempAppFolder();
        var path = app.Write(
            "ui/form/RuleHandler.js",
            "var conditionalRuleHandlerObject = { nested: function(other) { let result = false; if(other.answer === 'yes') result = true; return result; }, outer: function(values) { return conditionalRuleHandlerObject.nested(values); } };"
        );
        var parser = new RuleHandlerParser(path);
        parser.Parse();
        var converter = new ExpressionConverter(parser.GetGlobalConstants(), parser.GetAllConditionalFunctions());
        var converted = converter.Convert(
            "function(values) { return conditionalRuleHandlerObject.nested(values); }",
            new() { ["answer"] = "choice" },
            "Hide",
            new Dictionary<string, string> { ["answer"] = "string" }
        );
        AssertExpression("[\"equals\",[\"dataModel\",\"choice\"],\"yes\"]", converted);
        Assert.Equal(
            ConversionStatus.Failed,
            converter
                .Convert(
                    "function(values) { return conditionalRuleHandlerObject.nested(values.answer); }",
                    new() { ["answer"] = "choice" },
                    "Hide"
                )
                .Status
        );
    }

    [Fact]
    public void InputMetadata_DoesNotTreatTextInputsAsFixedOptionDomains()
    {
        using var app = new TempAppFolder();
        app.Write(
            "ui/form/layouts/page.json",
            """
            { "data": { "layout": [
              { "id": "fixed", "type": "RadioButtons", "dataModelBindings": { "simpleBinding": "choice" }, "options": [{ "value": "yes" }, { "value": "no" }] },
              { "id": "free", "type": "Input", "dataModelBindings": { "simpleBinding": "freeText" } }
            ] } }
            """
        );
        var metadata = new ConditionalRuleInputMetadata(app.Root, Path.Combine(app.Root, "App", "ui", "form"));
        var options = metadata.GetOptions(
            new Dictionary<string, string> { ["answer"] = "choice", ["text"] = "freeText" }
        );
        Assert.Equal(s_yesNoOptions, options["answer"]);
        Assert.False(options.ContainsKey("text"));
    }

    [Theory]
    [InlineData("\"optionsId\":\"choices\"", true)]
    [InlineData("\"optionsId\":\"choices\",\"queryParameters\":{}", true)]
    [InlineData("\"optionsId\":\"choices\",\"queryParameters\":{\"region\":\"asia\"}", false)]
    [InlineData("\"optionsId\":\"choices\",\"queryParameters\":{\"region\":[\"dataModel\",\"region\"]}", false)]
    [InlineData("\"optionsId\":\"choices\",\"options\":[{\"value\":\"inline\"}]", false)]
    [InlineData("\"options\":[{\"value\":\"yes\"},{\"value\":\"no\"}],\"queryParameters\":{\"ignored\":true}", true)]
    public void InputMetadata_UsesOnlyTheStaticOptionDomainSelectedAtRuntime(string configuration, bool hasDomain)
    {
        using var app = new TempAppFolder();
        app.Write("options/choices.json", """[{"value":"yes"},{"value":"no"}]""");
        app.Write(
            "ui/form/layouts/page.json",
            "{\"data\":{\"layout\":[{\"id\":\"selection\",\"type\":\"RadioButtons\",\"dataModelBindings\":{\"simpleBinding\":\"choice\"},"
                + configuration
                + "}]}}"
        );
        var metadata = new ConditionalRuleInputMetadata(app.Root, Path.Combine(app.Root, "App", "ui", "form"));
        var options = metadata.GetOptions(new Dictionary<string, string> { ["answer"] = "choice" });
        Assert.Equal(hasDomain, options.ContainsKey("answer"));
        if (hasDomain)
            Assert.Equal(s_yesNoOptions, options["answer"]);
    }

    [Fact]
    public void InputMetadata_UsesSchemaForEnumTypesAndKeepsKnownCSharpTypes()
    {
        using var app = new TempAppFolder();
        app.Write("ui/layout-sets.json", """{"sets":[{"id":"form","dataType":"model"}]}""");
        app.Write(
            "config/applicationmetadata.json",
            """{"dataTypes":[{"id":"model","appLogic":{"classRef":"Models.Model"}}]}"""
        );
        app.Write(
            "models/model.cs",
            "namespace Models { public enum Status { None, Submitted }; public class Model { public Status status { get; set; } public string text { get; set; } } }"
        );
        app.Write(
            "models/model.schema.json",
            """{"type":"object","properties":{"status":{"type":"integer"},"text":{"type":"number"}}}"""
        );
        var metadata = new ConditionalRuleInputMetadata(app.Root, Path.Combine(app.Root, "App", "ui", "form"));
        var types = metadata.GetTypes(new Dictionary<string, string> { ["state"] = "status", ["value"] = "text" });
        Assert.Equal("number", types["state"]);
        Assert.Equal("string", types["value"]);
    }

    [Theory]
    [InlineData("values.amount >= 301 && values.amount <= 700")]
    [InlineData("301 <= values.amount && values.amount <= 700")]
    public void NumericLowerBound_ProvesTheUpperBoundCannotReadANull(string predicate)
    {
        var result = new ExpressionConverter().Convert(
            "function(values) { return " + predicate + "; }",
            new() { ["amount"] = "amount" },
            "Hide",
            new Dictionary<string, string> { ["amount"] = "number" }
        );
        Assert.True(result.Status == ConversionStatus.Success, string.Join("\n", result.DebugInfo));
    }

    [Fact]
    public void GlobalNull_IsPreservedAndMutableGlobalsAreNotInlined()
    {
        using var app = new TempAppFolder();
        var path = app.Write(
            "ui/form/RuleHandler.js",
            "var absent = null; var changing = 1; var stable = 2; var conditionalRuleHandlerObject = { first: function(values) { changing = 3; return true; }, second: function(values) { return changing === 1; } };"
        );
        var parser = new RuleHandlerParser(path);
        parser.Parse();
        Assert.Null(parser.GetGlobalConstants()["absent"]);
        Assert.Equal(2d, parser.GetGlobalConstants()["stable"]);
        Assert.False(parser.GetGlobalConstants().ContainsKey("changing"));
        var converter = new ExpressionConverter(parser.GetGlobalConstants(), parser.GetAllConditionalFunctions());
        AssertExpression("false", converter.Convert("function(values) { return absent; }", new(), "Hide"));
        Assert.Equal(
            ConversionStatus.Failed,
            converter.Convert("function(values) { return changing === 1; }", new(), "Hide").Status
        );
    }

    [Fact]
    public void TruthinessGuard_ImpliedByStringEquality_IsRemoved()
    {
        AssertExpression(
            "[\"equals\",[\"dataModel\",\"choice\"],\"yes\"]",
            Convert("function(values) { return values.answer && values.answer === 'yes'; }")
        );
        AssertExpression(
            "[\"equals\",[\"dataModel\",\"choice\"],\"yes\"]",
            Convert("function(values) { return values.answer != null && values.answer === 'yes'; }")
        );
    }

    [Theory]
    [InlineData("true")]
    [InlineData("false")]
    [InlineData("Null")]
    public void ReservedStringEquality_PreservesCaseWithJmespath(string literal)
    {
        var expected = new JsonArray("jmespath", new JsonArray("dataModel", "choice"), "@ == '" + literal + "'");
        AssertExpression(
            expected.ToJsonString(),
            Convert("function(values) { return values.answer === '" + literal + "'; }")
        );
    }

    [Theory]
    [InlineData("values.a + values.b === 0.3")]
    [InlineData("values.a > values.b * 24000")]
    [InlineData("values.b && values.a / values.b < 0.4")]
    public void FractionalArithmeticDecisions_RequireManualConversion(string predicate)
    {
        var result = new ExpressionConverter().Convert(
            "function(values) { return " + predicate + "; }",
            new() { ["a"] = "a", ["b"] = "b" },
            "Hide",
            new Dictionary<string, string> { ["a"] = "number", ["b"] = "number" }
        );
        Assert.Equal(ConversionStatus.Failed, result.Status);
        Assert.Contains("boundary decisions", result.FailureReason);
    }

    private static ConversionResult Convert(string function, string action = "Hide") =>
        new ExpressionConverter().Convert(
            function,
            new() { ["answer"] = "choice" },
            action,
            new Dictionary<string, string> { ["answer"] = "string" }
        );

    private static void AssertExpression(string expected, ConversionResult result)
    {
        Assert.True(result.Status == ConversionStatus.Success, string.Join("\n", result.DebugInfo));
        Assert.True(
            JsonNode.DeepEquals(JsonNode.Parse(expected), JsonSerializer.SerializeToNode(result.Expression)),
            JsonSerializer.Serialize(result.Expression)
        );
    }
}
