using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches conditional (ternary) expressions: condition ? consequent : alternate
/// Converts them to ["if", condition, consequent, "else", alternate] format
/// </summary>
public class ConditionalExpressionMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        return expression is ConditionalExpression;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not ConditionalExpression conditionalExpr)
            return null;

        debugInfo.Add("Converting conditional expression (ternary operator)");

        // Convert the test condition
        var test = context.ConvertExpression(conditionalExpr.Test, debugInfo);
        if (test == null)
        {
            debugInfo.Add("❌ Failed to convert condition of ternary expression");
            return null;
        }

        // Convert the consequent (true branch)
        var consequent = context.ConvertExpression(conditionalExpr.Consequent, debugInfo);
        if (consequent == null)
        {
            debugInfo.Add("❌ Failed to convert consequent (true branch) of ternary expression");
            return null;
        }

        // Convert the alternate (false branch)
        var alternate = context.ConvertExpression(conditionalExpr.Alternate, debugInfo);
        if (alternate == null)
        {
            debugInfo.Add("❌ Failed to convert alternate (false branch) of ternary expression");
            return null;
        }

        // Unwrap null values if present
        var consequentValue = UnwrapNullValue(consequent);
        var alternateValue = UnwrapNullValue(alternate);

        debugInfo.Add("✅ Successfully converted conditional expression");

        return new object?[] { "if", test, consequentValue, "else", alternateValue };
    }

    /// <summary>
    /// Unwrap null values that were wrapped to distinguish from conversion failure
    /// </summary>
    private static object? UnwrapNullValue(object value)
    {
        // Check if this is a wrapped null (single-element array containing null)
        if (value is object?[] array && array.Length == 1 && array[0] == null)
        {
            return null;
        }
        return value;
    }
}
