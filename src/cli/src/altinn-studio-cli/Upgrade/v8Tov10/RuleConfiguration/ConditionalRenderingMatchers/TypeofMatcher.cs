using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches typeof expressions used for checking if a value is defined
/// Converts typeof x !== "undefined" to a null check
/// </summary>
public class TypeofMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        // Check if this is a binary expression with typeof on one side
        if (expression is BinaryExpression binaryExpr)
        {
            // typeof x === "undefined" or typeof x !== "undefined"
            return (binaryExpr.Left is UnaryExpression leftUnary && IsTypeofOperator(leftUnary))
                || (binaryExpr.Right is UnaryExpression rightUnary && IsTypeofOperator(rightUnary));
        }

        return false;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not BinaryExpression binaryExpr)
            return null;

        // Determine which side has typeof
        UnaryExpression? typeofExpr = null;
        Expression? comparisonValue = null;

        if (binaryExpr.Left is UnaryExpression leftUnary && IsTypeofOperator(leftUnary))
        {
            typeofExpr = leftUnary;
            comparisonValue = binaryExpr.Right;
        }
        else if (binaryExpr.Right is UnaryExpression rightUnary && IsTypeofOperator(rightUnary))
        {
            typeofExpr = rightUnary;
            comparisonValue = binaryExpr.Left;
        }

        if (typeofExpr == null || comparisonValue == null)
        {
            debugInfo.Add("❌ Could not extract typeof expression");
            return null;
        }

        // Check if we're comparing to "undefined"
        if (comparisonValue is not Literal literal || literal.Value as string != "undefined")
        {
            debugInfo.Add("❌ typeof is not being compared to 'undefined'");
            return null;
        }

        // Get the operator
        var op = binaryExpr.Operator.ToString();

        // typeof x !== "undefined" means x is NOT null (value exists)
        // typeof x === "undefined" means x IS null (value doesn't exist)
        bool isCheckingForDefined = op == "!==" || op == "StrictInequality" || op == "!=" || op == "Inequality";

        debugInfo.Add(
            $"Converting typeof check to null check (checking for {(isCheckingForDefined ? "defined" : "undefined")})"
        );

        // Convert the argument of typeof to a data model reference
        var target = context.ConvertExpression(typeofExpr.Argument, debugInfo);
        if (target == null)
        {
            debugInfo.Add("❌ Failed to convert typeof argument");
            return null;
        }

        // Create the appropriate null check
        if (isCheckingForDefined)
        {
            // typeof x !== "undefined" → not null check
            debugInfo.Add("✅ Converted to 'not null' check");
            // ! null literal is intentionally used as the comparison value in the expression
            return new object[] { "notEquals", target, null! };
        }
        else
        {
            // typeof x === "undefined" → null check
            debugInfo.Add("✅ Converted to 'equals null' check");
            // ! null literal is intentionally used as the comparison value in the expression
            return new object[] { "equals", target, null! };
        }
    }

    private static bool IsTypeofOperator(UnaryExpression unary)
    {
        var op = unary.Operator.ToString();
        return op == "typeof" || op == "TypeOf";
    }
}
