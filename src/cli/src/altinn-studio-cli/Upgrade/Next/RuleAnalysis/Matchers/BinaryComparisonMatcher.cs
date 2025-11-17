using Acornima.Ast;

namespace AltinnCLI.Upgrade.Next.RuleAnalysis.Matchers;

/// <summary>
/// Matches binary comparison expressions (===, !==, >, <, >=, <=)
/// </summary>
public class BinaryComparisonMatcher : IExpressionMatcher
{
    private static readonly Dictionary<string, string> OperatorMap = new()
    {
        { "===", "equals" },
        { "==", "equals" },
        { "!==", "notEquals" },
        { "!=", "notEquals" },
        { ">", "greaterThan" },
        { ">=", "greaterThanEq" },
        { "<", "lessThan" },
        { "<=", "lessThanEq" },
    };

    public bool CanMatch(Expression expression)
    {
        if (expression is not BinaryExpression binaryExpr)
            return false;

        return OperatorMap.ContainsKey(binaryExpr.Operator.ToString());
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not BinaryExpression binaryExpr)
            return null;

        var op = binaryExpr.Operator.ToString();
        if (!OperatorMap.TryGetValue(op, out var exprFunction))
        {
            debugInfo.Add($"⚠️ Unsupported binary operator: {op}");
            return null;
        }

        debugInfo.Add($"Converting binary expression: {op} -> {exprFunction}");

        // Convert left side
        var left = context.ConvertExpression(binaryExpr.Left, debugInfo);
        if (left == null)
        {
            debugInfo.Add("⚠️ Failed to convert left side of binary expression");
            return null;
        }

        // Convert right side
        var right = context.ConvertExpression(binaryExpr.Right, debugInfo);
        if (right == null)
        {
            debugInfo.Add("⚠️ Failed to convert right side of binary expression");
            return null;
        }

        return new object[] { exprFunction, left, right };
    }
}
