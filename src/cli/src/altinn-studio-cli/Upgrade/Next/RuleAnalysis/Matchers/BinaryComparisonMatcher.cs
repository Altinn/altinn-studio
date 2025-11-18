using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Matchers;

/// <summary>
/// Matches binary comparison expressions (===, !==, >, <, >=, <=)
/// </summary>
public class BinaryComparisonMatcher : IExpressionMatcher
{
    private static readonly Dictionary<string, string> OperatorMap = new()
    {
        // Symbol operators
        { "===", "equals" },
        { "==", "equals" },
        { "!==", "notEquals" },
        { "!=", "notEquals" },
        { ">", "greaterThan" },
        { ">=", "greaterThanEq" },
        { "<", "lessThan" },
        { "<=", "lessThanEq" },
        // Acornima enum names
        { "StrictEquality", "equals" },
        { "StrictInequality", "notEquals" },
        { "Equality", "equals" },
        { "Inequality", "notEquals" },
        { "GreaterThan", "greaterThan" },
        { "GreaterThanOrEqual", "greaterThanEq" },
        { "LessThan", "lessThan" },
        { "LessThanOrEqual", "lessThanEq" },
    };

    public bool CanMatch(Expression expression)
    {
        // Check if this is a binary expression (includes subclasses like NonLogicalBinaryExpression)
        if (expression is BinaryExpression binaryExpr)
        {
            var op = binaryExpr.Operator.ToString();
            return OperatorMap.ContainsKey(op);
        }

        return false;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not BinaryExpression binaryExpr)
            return null;

        var op = binaryExpr.Operator.ToString();
        if (!OperatorMap.TryGetValue(op, out var exprFunction))
        {
            debugInfo.Add($"❌ Unsupported binary operator: {op}");
            return null;
        }

        var left = context.ConvertExpression(binaryExpr.Left, debugInfo);
        if (left == null)
        {
            debugInfo.Add($"❌ Failed to convert left side of {op}");
            return null;
        }

        var right = context.ConvertExpression(binaryExpr.Right, debugInfo);
        if (right == null)
        {
            debugInfo.Add($"❌ Failed to convert right side of {op}");
            return null;
        }

        // Unwrap null values (they're wrapped in arrays to distinguish from conversion failure)
        var leftValue = UnwrapNullValue(left);
        var rightValue = UnwrapNullValue(right);

        return new object?[] { exprFunction, leftValue, rightValue };
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
