using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Matchers;

/// <summary>
/// Matches string.indexOf(value) comparisons and converts them to contains checks
/// string.indexOf(value) !== -1 → ["contains", string, value]
/// string.indexOf(value) === -1 → ["not", ["contains", string, value]]
/// </summary>
public class IndexOfMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        if (expression is not BinaryExpression binaryExpr)
            return false;

        // Check if this is a comparison with -1
        var hasNegativeOne = IsNegativeOne(binaryExpr.Left) || IsNegativeOne(binaryExpr.Right);
        if (!hasNegativeOne)
            return false;

        // Check if the other side is an indexOf() call or the special indexOf marker
        var otherSide = IsNegativeOne(binaryExpr.Left) ? binaryExpr.Right : binaryExpr.Left;
        return IsIndexOfCall(otherSide) || IsIndexOfMarker(otherSide);
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not BinaryExpression binaryExpr)
            return null;

        // Get the operator
        var op = binaryExpr.Operator.ToString();

        // indexOf(x) !== -1 means "contains", indexOf(x) === -1 means "does not contain"
        bool isCheckingForContains = op == "!=" || op == "Inequality" || op == "!==" || op == "StrictInequality";

        debugInfo.Add($"Converting indexOf() {op} -1 to {(isCheckingForContains ? "contains" : "not contains")} check");

        // Determine which side has indexOf() and which has -1
        // Try to convert both sides - one should be the indexOf marker, the other should be -1
        var leftConverted = context.ConvertExpression(binaryExpr.Left, debugInfo);
        var rightConverted = context.ConvertExpression(binaryExpr.Right, debugInfo);

        // Check if one side is the indexOf marker ["__indexOf__", subject, searchValue]
        object?[]? indexOfMarker = null;
        if (leftConverted is object?[] leftArray && leftArray.Length == 3 && leftArray[0] as string == "__indexOf__")
        {
            indexOfMarker = leftArray;
        }
        else if (
            rightConverted is object?[] rightArray
            && rightArray.Length == 3
            && rightArray[0] as string == "__indexOf__"
        )
        {
            indexOfMarker = rightArray;
        }

        if (indexOfMarker == null)
        {
            debugInfo.Add("❌ Could not find indexOf marker in comparison");
            return null;
        }

        // Extract the string and search value from the marker
        var stringExpression = indexOfMarker[1];
        var searchValue = indexOfMarker[2];

        // Build the contains expression
        var containsExpression = new object[] { "contains", stringExpression!, searchValue! };

        if (isCheckingForContains)
        {
            // indexOf(x) !== -1 → contains
            debugInfo.Add("✅ Converted to 'contains'");
            return containsExpression;
        }
        else
        {
            // indexOf(x) === -1 → not contains
            debugInfo.Add("✅ Converted to 'not contains'");
            return new object[] { "not", containsExpression };
        }
    }

    /// <summary>
    /// Check if an expression is the literal value -1
    /// </summary>
    private static bool IsNegativeOne(Expression expr)
    {
        // Check for literal -1
        if (expr is Literal literal)
        {
            return literal.Value is int i && i == -1;
        }

        // Check for unary negation of 1: -1
        if (expr is UnaryExpression unaryExpr)
        {
            var op = unaryExpr.Operator.ToString();
            if ((op == "-" || op == "UnaryMinus") && unaryExpr.Argument is Literal argLiteral)
            {
                return argLiteral.Value is int i && i == 1;
            }
        }

        return false;
    }

    /// <summary>
    /// Check if an expression is a call to indexOf()
    /// </summary>
    private static bool IsIndexOfCall(Expression expr)
    {
        if (expr is not CallExpression callExpr)
            return false;

        if (callExpr.Callee is not MemberExpression memberExpr)
            return false;

        var methodName = memberExpr.Property switch
        {
            Identifier id => id.Name,
            _ => null,
        };

        return methodName == "indexOf";
    }

    /// <summary>
    /// Check if an expression could potentially be converted to the indexOf marker
    /// This is just a heuristic check since we can't know the result without converting
    /// </summary>
    private static bool IsIndexOfMarker(Expression expr)
    {
        // This is called during CanMatch, where we don't have converted values yet
        // We can only check if it's a CallExpression that might be indexOf
        return IsIndexOfCall(expr);
    }
}
