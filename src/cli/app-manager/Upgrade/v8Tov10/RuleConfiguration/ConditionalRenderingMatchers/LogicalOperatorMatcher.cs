using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches logical operator expressions (&amp;&amp;, ||, !)
/// </summary>
public class LogicalOperatorMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        if (expression is LogicalExpression)
            return true;

        if (expression is UnaryExpression unary)
        {
            var op = unary.Operator.ToString();
            return op == "!" || op == "LogicalNot";
        }

        return false;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        // Handle logical expressions (&&, ||)
        if (expression is LogicalExpression logicalExpr)
        {
            return MatchLogicalExpression(logicalExpr, context, debugInfo);
        }

        // Handle unary not (!)
        if (expression is UnaryExpression unaryExpr)
        {
            var op = unaryExpr.Operator.ToString();
            if (op == "!" || op == "LogicalNot")
            {
                return MatchUnaryNot(unaryExpr, context, debugInfo);
            }
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
            "LogicalAnd" => "and", // Acornima enum name
            "LogicalOr" => "or", // Acornima enum name
            _ => "",
        };

        if (string.IsNullOrEmpty(exprFunction))
        {
            debugInfo.Add($"❌ Unsupported logical operator: {op}");
            return null;
        }

        // Flatten chains of the same operator (e.g., a || b || c || d)
        var operands = FlattenLogicalExpression(logicalExpr, op);

        // Convert all operands, with special handling for truthiness checks in AND expressions
        var convertedOperands = new List<object?>();
        foreach (var operand in operands)
        {
            object? converted;

            // For AND expressions, check if this is a truthiness check (e.g., "obj.value &&")
            if (exprFunction == "and" && TruthinessCheckMatcher.IsTruthinessCheck(operand))
            {
                converted = TruthinessCheckMatcher.ConvertTruthinessCheck(operand, context, debugInfo);
            }
            else
            {
                converted = context.ConvertExpression(operand, debugInfo);
            }

            if (converted == null)
                return null;

            // Unwrap null values (they're wrapped in arrays to distinguish from conversion failure)
            convertedOperands.Add(UnwrapNullValue(converted));
        }

        // Try to optimize common patterns before building the result
        if (exprFunction == "or")
        {
            var optimized = TryOptimizeOrExpression(convertedOperands, debugInfo);
            if (optimized != null)
            {
                return optimized;
            }
        }

        // Build the expression array: ["or", operand1, operand2, operand3, ...]
        var result = new List<object?> { exprFunction };
        result.AddRange(convertedOperands);
        return result.ToArray();
    }

    /// <summary>
    /// Try to optimize OR expressions for common patterns
    /// Pattern: ["equals", X, null] OR ["notEquals", X, Y] => ["notEquals", X, Y]
    /// Rationale: If X equals null OR X doesn't equal Y, this is logically equivalent to X != Y
    /// because null != Y is already true (unless Y is also null, but that's edge case)
    /// </summary>
    private object? TryOptimizeOrExpression(List<object?> operands, List<string> debugInfo)
    {
        // Only optimize if we have exactly 2 operands
        if (operands.Count != 2)
            return null;

        // Check for pattern: ["equals", X, null] OR ["notEquals", X, Y]
        if (TryOptimizeNullCheckOrNotEquals(operands[0], operands[1], debugInfo, out var result))
            return result;

        // Check reversed: ["notEquals", X, Y] OR ["equals", X, null]
        if (TryOptimizeNullCheckOrNotEquals(operands[1], operands[0], debugInfo, out result))
            return result;

        return null;
    }

    /// <summary>
    /// Check if first operand is ["equals", X, null] and second is ["notEquals", X, Y]
    /// If so, optimize to just ["notEquals", X, Y]
    /// </summary>
    private bool TryOptimizeNullCheckOrNotEquals(
        object? first,
        object? second,
        List<string> debugInfo,
        out object? result
    )
    {
        result = null;

        // Check if first is ["equals", X, null]
        if (first is not object[] firstArray || firstArray.Length != 3)
            return false;

        if (firstArray[0] as string != "equals" || firstArray[2] != null)
            return false;

        // Check if second is ["notEquals", X, Y] where Y is not null
        if (second is not object[] secondArray || secondArray.Length != 3)
            return false;

        if (secondArray[0] as string != "notEquals" || secondArray[2] == null)
            return false;

        // Check if both reference the same subject (X)
        if (!ExpressionsEqual(firstArray[1], secondArray[1]))
            return false;

        debugInfo.Add("✅ Optimized pattern: [\"equals\", X, null] OR [\"notEquals\", X, Y] => [\"notEquals\", X, Y]");
        result = second;
        return true;
    }

    /// <summary>
    /// Compare two expression objects for equality (deep comparison)
    /// </summary>
    private bool ExpressionsEqual(object? a, object? b)
    {
        if (a == null && b == null)
            return true;
        if (a == null || b == null)
            return false;

        // If both are arrays, compare element by element
        if (a is object[] arrayA && b is object[] arrayB)
        {
            if (arrayA.Length != arrayB.Length)
                return false;

            for (int i = 0; i < arrayA.Length; i++)
            {
                if (!ExpressionsEqual(arrayA[i], arrayB[i]))
                    return false;
            }
            return true;
        }

        // Otherwise, use standard equality
        return Equals(a, b);
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

    /// <summary>
    /// Flatten chains of the same logical operator
    /// E.g., (a || b) || (c || d) becomes [a, b, c, d]
    /// </summary>
    private List<Expression> FlattenLogicalExpression(LogicalExpression expr, string op)
    {
        var operands = new List<Expression>();

        // Normalize operator name (handle both enum names and symbols)
        var normalizedOp = NormalizeOperator(op);

        // Check left side
        if (
            expr.Left is LogicalExpression leftLogical
            && NormalizeOperator(leftLogical.Operator.ToString()) == normalizedOp
        )
        {
            operands.AddRange(FlattenLogicalExpression(leftLogical, op));
        }
        else
        {
            operands.Add(expr.Left);
        }

        // Check right side
        if (
            expr.Right is LogicalExpression rightLogical
            && NormalizeOperator(rightLogical.Operator.ToString()) == normalizedOp
        )
        {
            operands.AddRange(FlattenLogicalExpression(rightLogical, op));
        }
        else
        {
            operands.Add(expr.Right);
        }

        return operands;
    }

    private string NormalizeOperator(string op)
    {
        return op switch
        {
            "&&" or "LogicalAnd" => "and",
            "||" or "LogicalOr" => "or",
            _ => op,
        };
    }

    private object? MatchUnaryNot(UnaryExpression unaryExpr, ConversionContext context, List<string> debugInfo)
    {
        var argument = context.ConvertExpression(unaryExpr.Argument, debugInfo);
        return argument == null ? null : new[] { "not", argument };
    }
}
