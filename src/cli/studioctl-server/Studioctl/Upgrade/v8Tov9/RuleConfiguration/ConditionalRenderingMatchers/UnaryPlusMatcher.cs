using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches unary operators like + (numeric coercion) and ! (logical negation)
/// </summary>
public class UnaryPlusMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        // Check if this is a UnaryExpression or any of its subclasses
        if (expression is UnaryExpression unary)
        {
            var op = unary.Operator.ToString();
            return op == "+"
                || op == "UnaryPlus"
                || op == "!"
                || op == "LogicalNot"
                || op == "-"
                || op == "UnaryMinus"
                || op == "UnaryNegation";
        }

        return false;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not UnaryExpression unaryExpr)
            return null;

        var op = unaryExpr.Operator.ToString();

        // Handle logical negation (!)
        if (op == "!" || op == "LogicalNot")
        {
            var argument = context.ConvertBoolean(unaryExpr.Argument, debugInfo);
            return argument == null ? null : new object[] { "not", argument };
        }

        // Handle unary minus for negative numbers
        if (op == "-" || op == "UnaryMinus" || op == "UnaryNegation")
        {
            debugInfo.Add("Converting unary - (negative number)");

            var argument = context.ConvertExpression(unaryExpr.Argument, debugInfo);
            if (argument == null)
            {
                return context.Reject("❌ Failed to convert argument of unary - expression", debugInfo);
            }

            // If the argument is a number, negate it
            if (argument is int i)
                return -i;
            if (argument is long l)
                return -l;
            if (argument is double d)
                return -d;
            if (argument is float f)
                return -f;

            if (context.GetValueType(unaryExpr.Argument) == "number")
                return new object[] { "minus", 0, argument };

            return context.Reject("⚠️ Unary minus applied to non-numeric value", debugInfo);
        }

        // Numeric coercion must remain numeric. Returning the input unchanged loses
        // the distinction between +"01" and "01" during equality comparisons.
        if (context.GetValueType(unaryExpr.Argument) != "number")
        {
            return context.Reject(
                "Unary numeric coercion requires a present numeric input so undefined does not become zero",
                debugInfo
            );
        }
        var positiveArgument = context.ConvertExpression(unaryExpr.Argument, debugInfo);
        return positiveArgument == null ? null : new object[] { "plus", positiveArgument, 0 };
    }
}
