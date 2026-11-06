using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ExpressionSimplifierTests
{
    [Fact]
    public void KnownNumericDiscriminator_RemovesUnreachableNestedChoices()
    {
        var expression = JsonNode.Parse(
            """
            ["if", ["and", ["greaterThanEq", ["dataModel", "choice"], 1], ["lessThanEq", ["dataModel", "choice"], 1]],
                ["if", ["and", ["greaterThanEq", ["dataModel", "choice"], 2], ["lessThanEq", ["dataModel", "choice"], 2]], 99, "else", ["dataModel", "a"]],
                "else", ["dataModel", "b"]]
            """
        );
        var expected = JsonNode.Parse(
            """
            ["if", ["and", ["greaterThanEq", ["dataModel", "choice"], 1], ["lessThanEq", ["dataModel", "choice"], 1]],
                ["dataModel", "a"], "else", ["dataModel", "b"]]
            """
        );

        Assert.True(JsonNode.DeepEquals(expected, ExpressionSimplifier.Simplify(expression)));
    }

    [Fact]
    public void KnownCondition_KeepsSafeDenominatorInEagerBranch()
    {
        var expression = JsonNode.Parse(
            """
            ["if", ["and", ["greaterThanEq", ["dataModel", "b"], 0], ["lessThanEq", ["dataModel", "b"], 0]], 0, "else",
                ["divide", ["dataModel", "a"],
                    ["if", ["and", ["greaterThanEq", ["dataModel", "b"], 0], ["lessThanEq", ["dataModel", "b"], 0]], 1, "else", ["dataModel", "b"]]]]
            """
        );

        Assert.True(JsonNode.DeepEquals(expression, ExpressionSimplifier.Simplify(expression)));
    }

    [Theory]
    [InlineData("[\"not\", [\"not\", [\"dataModel\", \"flag\"]]]")]
    [InlineData("[\"and\", [\"dataModel\", \"flag\"]]")]
    [InlineData("[\"or\", [\"dataModel\", \"flag\"]]")]
    [InlineData("[\"if\", [\"dataModel\", \"flag\"], true, \"else\", false]")]
    public void UntypedRead_KeepsBooleanConversion(string json)
    {
        var expression = JsonNode.Parse(json);

        Assert.True(JsonNode.DeepEquals(expression, ExpressionSimplifier.Simplify(expression)));
    }

    [Fact]
    public void Sum_RemovesRedundantPerTermNumericDefaults()
    {
        var expression = JsonNode.Parse(
            """
            ["plus", ["plus", ["dataModel", "a"], 0], ["plus", ["dataModel", "b"], 0]]
            """
        );
        var expected = JsonNode.Parse("[\"plus\", [\"dataModel\", \"a\"], [\"dataModel\", \"b\"]]");

        Assert.True(JsonNode.DeepEquals(expected, ExpressionSimplifier.Simplify(expression)));
    }

    [Fact]
    public void Addition_PreservesRightHandGrouping()
    {
        var expression = JsonNode.Parse("[\"plus\", 1e16, [\"plus\", -1e16, 1]]");

        Assert.True(JsonNode.DeepEquals(expression, ExpressionSimplifier.Simplify(expression)));
    }
}
