using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches checks for the existence of the 'obj' parameter itself
/// These checks are unnecessary in expression language since we don't have the obj parameter
/// Examples: obj !== null, obj !== undefined, obj, etc.
/// These are treated as always true since if the expression is being evaluated, the context exists
/// </summary>
public class ObjectExistenceCheckMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        // Check if this is comparing obj to null/undefined
        if (expression is BinaryExpression binaryExpr)
        {
            // Check if either side is the obj identifier
            var leftIsObj = binaryExpr.Left is Identifier leftId && leftId.Name == "obj";
            var rightIsObj = binaryExpr.Right is Identifier rightId && rightId.Name == "obj";

            if (leftIsObj || rightIsObj)
            {
                // Check if the other side is null/undefined
                var otherSide = leftIsObj ? binaryExpr.Right : binaryExpr.Left;

                if (otherSide is Literal literal)
                {
                    return literal.Value == null || literal.Value as string == "undefined";
                }
            }
        }

        // Check if this is just 'obj' as a truthy check
        if (expression is Identifier identifier && identifier.Name == "obj")
        {
            return true;
        }

        // Check for !obj (falsy check)
        if (expression is UnaryExpression unaryExpr)
        {
            var op = unaryExpr.Operator.ToString();
            if ((op == "!" || op == "LogicalNot") && unaryExpr.Argument is Identifier argId && argId.Name == "obj")
            {
                return true;
            }
        }

        return false;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        // Handle binary comparisons: obj !== null, obj !== undefined, etc.
        if (expression is BinaryExpression binaryExpr)
        {
            var op = binaryExpr.Operator.ToString();

            // obj !== null or obj !== undefined should be treated as always true
            // obj === null or obj === undefined should be treated as always false
            bool isInequalityCheck = op == "!==" || op == "StrictInequality" || op == "!=" || op == "Inequality";

            debugInfo.Add(
                $"Detected obj existence check - {(isInequalityCheck ? "obj exists (true)" : "obj is null/undefined (false)")}"
            );

            // Return a boolean literal
            return isInequalityCheck; // true if checking obj !== null/undefined, false if checking obj === null/undefined
        }

        // Handle truthy check: obj
        if (expression is Identifier)
        {
            debugInfo.Add("Detected obj truthy check - treating as true");
            return true;
        }

        // Handle falsy check: !obj
        if (expression is UnaryExpression)
        {
            debugInfo.Add("Detected !obj falsy check - treating as false");
            return false;
        }

        return null;
    }
}
