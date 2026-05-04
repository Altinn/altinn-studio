using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

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
            // Check if the argument is a simple property access (truthiness check)
            // e.g., !obj.value should become ["equals", value, null]
            if (TruthinessCheckMatcher.IsTruthinessCheck(unaryExpr.Argument))
            {
                debugInfo.Add("Converting ! of property access (truthiness check) to equals null");

                var propertyValue = context.ConvertExpression(unaryExpr.Argument, debugInfo);
                if (propertyValue == null)
                {
                    debugInfo.Add("❌ Failed to convert property in negated truthiness check");
                    return null;
                }

                debugInfo.Add("✅ Successfully converted !property to equals null");
                // ! null literal is intentionally used as the comparison value in the expression
                return new object[] { "equals", propertyValue, null! };
            }

            // Otherwise, standard negation for boolean expressions
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

        // Handle unary minus for negative numbers
        if (op == "-" || op == "UnaryMinus" || op == "UnaryNegation")
        {
            debugInfo.Add("Converting unary - (negative number)");

            var argument = context.ConvertExpression(unaryExpr.Argument, debugInfo);
            if (argument == null)
            {
                debugInfo.Add("❌ Failed to convert argument of unary - expression");
                return null;
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

            debugInfo.Add("⚠️ Unary minus applied to non-numeric value");
            return null;
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
