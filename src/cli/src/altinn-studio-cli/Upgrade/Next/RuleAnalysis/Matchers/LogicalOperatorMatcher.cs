using Acornima.Ast;

namespace AltinnCLI.Upgrade.Next.RuleAnalysis.Matchers;

/// <summary>
/// Matches logical operator expressions (&&, ||, !)
/// </summary>
public class LogicalOperatorMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        return expression is LogicalExpression
            || expression is UnaryExpression unary && unary.Operator.ToString() == "!";
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        // Handle logical expressions (&&, ||)
        if (expression is LogicalExpression logicalExpr)
        {
            return MatchLogicalExpression(logicalExpr, context, debugInfo);
        }

        // Handle unary not (!)
        if (expression is UnaryExpression unaryExpr && unaryExpr.Operator.ToString() == "!")
        {
            return MatchUnaryNot(unaryExpr, context, debugInfo);
        }

        return null;
    }

    private object? MatchLogicalExpression(
        LogicalExpression logicalExpr,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        var op = logicalExpr.Operator.ToString();
        string exprFunction = op switch
        {
            "&&" => "and",
            "||" => "or",
            _ => "",
        };

        if (string.IsNullOrEmpty(exprFunction))
        {
            debugInfo.Add($"⚠️ Unsupported logical operator: {op}");
            return null;
        }

        debugInfo.Add($"Converting logical expression: {op} -> {exprFunction}");

        // Convert left side
        var left = context.ConvertExpression(logicalExpr.Left, debugInfo);
        if (left == null)
        {
            debugInfo.Add("⚠️ Failed to convert left side of logical expression");
            return null;
        }

        // Convert right side
        var right = context.ConvertExpression(logicalExpr.Right, debugInfo);
        if (right == null)
        {
            debugInfo.Add("⚠️ Failed to convert right side of logical expression");
            return null;
        }

        return new object[] { exprFunction, left, right };
    }

    private object? MatchUnaryNot(UnaryExpression unaryExpr, ConversionContext context, List<string> debugInfo)
    {
        debugInfo.Add("Converting unary not expression: ! -> not");

        // Convert the argument
        var argument = context.ConvertExpression(unaryExpr.Argument, debugInfo);
        if (argument == null)
        {
            debugInfo.Add("⚠️ Failed to convert argument of not expression");
            return null;
        }

        return new object[] { "not", argument };
    }
}
