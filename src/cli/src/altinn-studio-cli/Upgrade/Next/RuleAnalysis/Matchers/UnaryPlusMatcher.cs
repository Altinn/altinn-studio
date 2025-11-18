using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Matchers;

/// <summary>
/// Matches unary plus operator (+obj.value) used for numeric coercion
/// In expression language, numeric coercion is implicit, so we just pass through
/// </summary>
public class UnaryPlusMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        if (expression is not UnaryExpression unary)
            return false;

        var op = unary.Operator.ToString();
        return op == "+" || op == "UnaryPlus";
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not UnaryExpression unaryExpr)
            return null;

        debugInfo.Add("Converting unary + (numeric coercion) - implicit in expression language");

        // Just convert the inner expression, coercion is implicit
        var argument = context.ConvertExpression(unaryExpr.Argument, debugInfo);
        if (argument == null)
        {
            debugInfo.Add("⚠️ Failed to convert argument of unary + expression");
            return null;
        }

        // Return the argument directly - no explicit coercion needed
        return argument;
    }
}
