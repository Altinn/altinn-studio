using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Matchers;

/// <summary>
/// Matches unary operators like + (numeric coercion) and ! (logical negation)
/// </summary>
public class UnaryPlusMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        if (expression is not UnaryExpression unary)
            return false;

        var op = unary.Operator.ToString();
        return op == "+" || op == "UnaryPlus" || op == "!" || op == "LogicalNot";
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not UnaryExpression unaryExpr)
            return null;

        var op = unaryExpr.Operator.ToString();

        // Handle logical negation (!)
        if (op == "!" || op == "LogicalNot")
        {
            debugInfo.Add("Converting unary ! (logical negation) to 'not'");

            var argument = context.ConvertExpression(unaryExpr.Argument, debugInfo);
            if (argument == null)
            {
                debugInfo.Add("❌ Failed to convert argument of negation expression");
                return null;
            }

            debugInfo.Add("✅ Successfully converted negation to 'not'");
            return new object[] { "not", argument };
        }

        // Handle unary plus (numeric coercion)
        debugInfo.Add("Converting unary + (numeric coercion) - implicit in expression language");

        // Just convert the inner expression, coercion is implicit
        var positiveArgument = context.ConvertExpression(unaryExpr.Argument, debugInfo);
        if (positiveArgument == null)
        {
            debugInfo.Add("⚠️ Failed to convert argument of unary + expression");
            return null;
        }

        // Return the argument directly - no explicit coercion needed
        return positiveArgument;
    }
}
