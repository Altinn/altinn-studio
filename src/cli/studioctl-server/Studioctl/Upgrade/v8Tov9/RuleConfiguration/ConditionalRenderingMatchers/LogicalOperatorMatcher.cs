using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Preserves JavaScript's operand-returning logical operators outside boolean contexts.
/// </summary>
public class LogicalOperatorMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression) => expression is LogicalExpression;

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not LogicalExpression logical)
            return null;
        var test = context.ConvertBoolean(logical.Left, debugInfo);
        var left = context.ConvertExpression(logical.Left, debugInfo);
        var right = context.ConvertExpression(logical.Right, debugInfo);
        if (test == null || left == null || right == null)
            return null;
        var leftValue = Unwrap(left);
        var rightValue = Unwrap(right);
        return logical.Operator.ToString() switch
        {
            "LogicalAnd" or "&&" => new object?[] { "if", test, rightValue, "else", leftValue },
            "LogicalOr" or "||" => new object?[] { "if", test, leftValue, "else", rightValue },
            _ => null,
        };
    }

    private static object? Unwrap(object value) =>
        value is object?[] { Length: 1 } array && array[0] == null ? null : value;
}
