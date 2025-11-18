using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.ConditionalRenderingMatchers;

/// <summary>
/// Matches logical operator expressions (&&, ||, !)
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

        // Build the expression array: ["or", operand1, operand2, operand3, ...]
        var result = new List<object?> { exprFunction };
        result.AddRange(convertedOperands);
        return result.ToArray();
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
        if (argument == null)
            return null;

        return new object[] { "not", argument };
    }
}
