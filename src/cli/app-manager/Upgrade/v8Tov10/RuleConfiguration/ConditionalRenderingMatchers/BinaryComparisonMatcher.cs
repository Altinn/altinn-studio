using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches binary comparison expressions (===, !==, &gt;, &lt;, &gt;=, &lt;=)
/// </summary>
public class BinaryComparisonMatcher : IExpressionMatcher
{
    private static readonly Dictionary<string, string> _operatorMap = new()
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
            return _operatorMap.ContainsKey(op);
        }

        return false;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not BinaryExpression binaryExpr)
            return null;

        var op = binaryExpr.Operator.ToString();
        if (!_operatorMap.TryGetValue(op, out var exprFunction))
        {
            debugInfo.Add($"❌ Unsupported binary operator: {op}");
            return null;
        }

        // Check if this is an indexOf comparison pattern BEFORE converting
        // Pattern: string.indexOf(value) !== -1 or -1 !== string.indexOf(value)
        if (IsIndexOfCall(binaryExpr.Left) && IsNegativeOneLiteral(binaryExpr.Right))
        {
            return HandleIndexOfComparisonAst(binaryExpr.Left, op, context, debugInfo);
        }
        if (IsIndexOfCall(binaryExpr.Right) && IsNegativeOneLiteral(binaryExpr.Left))
        {
            return HandleIndexOfComparisonAst(binaryExpr.Right, op, context, debugInfo);
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
    /// Check if an AST expression is a call to indexOf()
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
    /// Check if an AST expression is the literal -1
    /// </summary>
    private static bool IsNegativeOneLiteral(Expression expr)
    {
        // Check for literal -1 (handles different numeric types)
        if (expr is Literal literal)
        {
            return literal.Value switch
            {
                int i => i == -1,
                long l => l == -1,
                double d => Math.Abs(d - (-1.0)) < 0.0001,
                float f => Math.Abs(f - (-1.0f)) < 0.0001f,
                _ => false,
            };
        }

        // Check for unary negation of 1: -1
        if (expr is UnaryExpression unaryExpr)
        {
            var op = unaryExpr.Operator.ToString();
            if ((op == "-" || op == "UnaryMinus" || op == "UnaryNegation") && unaryExpr.Argument is Literal argLiteral)
            {
                return argLiteral.Value switch
                {
                    int i => i == 1,
                    long l => l == 1,
                    double d => Math.Abs(d - 1.0) < 0.0001,
                    float f => Math.Abs(f - 1.0f) < 0.0001f,
                    _ => false,
                };
            }
        }

        return false;
    }

    /// <summary>
    /// Handle indexOf() comparison with -1 at the AST level
    /// </summary>
    private static object? HandleIndexOfComparisonAst(
        Expression indexOfExpr,
        string op,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        var callExpr = (CallExpression)indexOfExpr;
        var memberExpr = (MemberExpression)callExpr.Callee;

        debugInfo.Add($"Converting indexOf() {op} -1 to contains check");

        // Convert the subject (the string being searched)
        var subject = context.ConvertExpression(memberExpr.Object, debugInfo);
        if (subject == null)
        {
            debugInfo.Add("❌ Failed to convert subject of indexOf()");
            return null;
        }

        // Get the search value (first argument)
        if (callExpr.Arguments.Count == 0)
        {
            debugInfo.Add("❌ indexOf() requires at least one argument");
            return null;
        }

        var searchValue = context.ConvertExpression(callExpr.Arguments[0], debugInfo);
        if (searchValue == null)
        {
            debugInfo.Add("❌ Failed to convert search argument of indexOf()");
            return null;
        }

        // Unwrap null values
        var searchValueUnwrapped = UnwrapNullValue(searchValue);

        // indexOf(x) !== -1 means "contains", indexOf(x) === -1 means "does not contain"
        bool isCheckingForContains = op == "!==" || op == "StrictInequality" || op == "!=" || op == "Inequality";

        // ! subject is verified non-null on line 163, searchValueUnwrapped is non-null because searchValue is verified non-null on line 177
        var containsExpression = new object[] { "contains", subject!, searchValueUnwrapped! };

        if (isCheckingForContains)
        {
            debugInfo.Add("✅ Converted indexOf() !== -1 to 'contains'");
            return containsExpression;
        }
        else
        {
            debugInfo.Add("✅ Converted indexOf() === -1 to 'not contains'");
            return new object[] { "not", containsExpression };
        }
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
