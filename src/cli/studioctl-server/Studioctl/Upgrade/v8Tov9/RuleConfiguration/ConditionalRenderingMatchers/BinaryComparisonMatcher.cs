using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text.Json;
using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Converts comparisons only when expression coercion preserves the JavaScript comparison.
/// </summary>
public class BinaryComparisonMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression) => expression is BinaryExpression and not LogicalExpression;

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not BinaryExpression binary)
            return null;
        var op = binary.Operator.ToString();
        if (op is "Addition" or "Subtraction" or "Multiplication" or "Division")
            return ConvertArithmetic(binary, context, debugInfo);
        var equality = op is "Equality" or "StrictEquality" or "==" or "===";
        var inequality = op is "Inequality" or "StrictInequality" or "!=" or "!==";
        var strict = op is "StrictEquality" or "StrictInequality" or "===" or "!==";
        if (TryIndexOf(binary.Left, out var indexCall) && IsMinusOne(binary.Right))
            return ConvertIndexOf(indexCall, op, false, context, debugInfo);
        if (TryIndexOf(binary.Right, out indexCall) && IsMinusOne(binary.Left))
            return ConvertIndexOf(indexCall, op, true, context, debugInfo);
        var leftType = context.GetValueType(binary.Left);
        var rightType = context.GetValueType(binary.Right);
        // Check the lowered operands too: locals and helper calls may contain the arithmetic.
        if (leftType == "number" && rightType == "number")
            foreach (var operand in new[] { binary.Left, binary.Right })
            {
                var value = context.ConvertExpression(operand, debugInfo);
                if (value != null && NumericComparisonSafety.MayChangeBoundary(JsonSerializer.SerializeToNode(value)))
                    return context.Reject(
                        "Fractional arithmetic in a comparison can change JavaScript boundary decisions",
                        debugInfo
                    );
            }
        if (equality || inequality)
        {
            var converted = ConvertEquality(binary.Left, binary.Right, leftType, rightType, strict, context, debugInfo);
            if (converted == null)
                return null;
            return inequality ? new object[] { "not", converted } : converted;
        }
        var function = op switch
        {
            "GreaterThan" or ">" => "greaterThan",
            "GreaterThanOrEqual" or ">=" => "greaterThanEq",
            "LessThan" or "<" => "lessThan",
            "LessThanOrEqual" or "<=" => "lessThanEq",
            _ => null,
        };
        if (function == null)
            return context.Reject($"Unsupported conditional arithmetic operator: {op}", debugInfo);
        if (leftType != "number" || rightType != "number")
        {
            return context.Reject(
                "Relational comparisons require numeric operands; JavaScript string ordering is different",
                debugInfo
            );
        }
        var left = context.ConvertExpression(binary.Left, debugInfo);
        var right = context.ConvertExpression(binary.Right, debugInfo);
        if (left == null || right == null)
            return null;
        // The legacy binding supplied null for every configured missing/non-scalar input.
        // JavaScript relational operators coerce that null to zero.
        return new object[] { function, Numeric(left, binary.Left, context), Numeric(right, binary.Right, context) };
    }

    private static object Numeric(object value, Expression source, ConversionContext context) =>
        context.IsDefinitelyNonNull(source) ? value : new object[] { "plus", value, 0 };

    private static object? ConvertArithmetic(BinaryExpression binary, ConversionContext context, List<string> debugInfo)
    {
        if (context.GetValueType(binary.Left) != "number" || context.GetValueType(binary.Right) != "number")
            return context.Reject("Arithmetic requires numeric model inputs", debugInfo);
        var division = binary.Operator.ToString() == "Division";
        if (division && !context.IsDefinitelyNonZero(binary.Right))
            return context.Reject("Division is not guarded against a zero denominator", debugInfo);
        var left = context.ConvertExpression(binary.Left, debugInfo);
        var right = context.ConvertExpression(binary.Right, debugInfo);
        if (left == null || right == null)
            return null;
        left = Numeric(left, binary.Left, context);
        right = Numeric(right, binary.Right, context);
        // Conditional branches are eager in both engines. Keep an unreachable divide safe.
        if (division)
            right = new object[]
            {
                "if",
                ExpressionConverter.NumericEquals(new object[] { "plus", right, 0 }, 0),
                1,
                "else",
                right,
            };
        var operation = binary.Operator.ToString() switch
        {
            "Addition" => "plus",
            "Subtraction" => "minus",
            "Multiplication" => "multiply",
            _ => "divide",
        };
        return new object[] { operation, left, right };
    }

    internal static bool NullComparisonIsFalse(Expression other, string function, bool reversed)
    {
        var sign = 1d;
        if (other is UnaryExpression unary && unary.Operator.ToString() is "UnaryNegation" or "UnaryMinus" or "-")
        {
            sign = -1d;
            other = unary.Argument;
        }
        if (other is not Literal { Value: double value })
            return false;
        var left = reversed ? sign * value : 0d;
        var right = reversed ? 0d : sign * value;
        return function switch
        {
            "greaterThan" => !(left > right),
            "greaterThanEq" => !(left >= right),
            "lessThan" => !(left < right),
            "lessThanEq" => !(left <= right),
            _ => false,
        };
    }

    private static object? ConvertEquality(
        Expression leftExpression,
        Expression rightExpression,
        string? leftType,
        string? rightType,
        bool strict,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        if (leftType is "null" or "undefined" || rightType is "null" or "undefined")
        {
            if (leftType is "null" or "undefined" && rightType is "null" or "undefined")
                return !strict || leftType == rightType;
            var subject = leftType is "null" or "undefined" ? rightExpression : leftExpression;
            var subjectType = leftType is "null" or "undefined" ? rightType : leftType;
            if (subjectType == "object")
                return false;
            if (context.IsDefinitelyNonNull(subject))
                return false;
            if (strict && (leftType == "undefined" || rightType == "undefined"))
                return false;
            if ((subjectType == "string" || subjectType == null) && !context.HasSafeStringDomain(subject))
            {
                return context.Reject(
                    "Unrestricted strings may contain the reserved expression value 'null'",
                    debugInfo
                );
            }
            var value = context.ConvertExpression(subject, debugInfo);
            return value == null ? null : new object?[] { "equals", value, null };
        }
        if (leftType == "object" || rightType == "object")
        {
            if (leftType == "object" && rightType == "object")
                return true;
            return context.Reject("Object-to-primitive comparisons require manual conversion", debugInfo);
        }
        if (strict && leftType != null && rightType != null && leftType != rightType)
            return false;
        var left = context.ConvertExpression(leftExpression, debugInfo);
        var right = context.ConvertExpression(rightExpression, debugInfo);
        if (left == null || right == null)
            return null;
        if (leftType == "number" && rightType == "number")
        {
            if (
                leftExpression is MemberExpression
                && rightExpression is MemberExpression
                && (!context.IsDefinitelyNonNull(leftExpression) || !context.IsDefinitelyNonNull(rightExpression))
            )
            {
                return new object?[]
                {
                    "or",
                    new object?[]
                    {
                        "and",
                        new object?[] { "equals", left, null },
                        new object?[] { "equals", right, null },
                    },
                    ExpressionConverter.NumericEquals(left, right),
                };
            }
            return ExpressionConverter.NumericEquals(left, right);
        }
        if (leftType == "boolean" && rightType == "boolean")
        {
            if (
                strict
                && leftExpression is MemberExpression
                && rightExpression is MemberExpression
                && (!context.IsDefinitelyNonNull(leftExpression) || !context.IsDefinitelyNonNull(rightExpression))
            )
                return null;
            return new object[] { "equals", left, right };
        }
        if (
            leftType == "string"
            && rightExpression is Literal { Value: string rightText }
            && ConversionContext.IsReservedString(rightText)
        )
            return ExactReservedStringEquality(left, rightText, context, debugInfo);
        if (
            rightType == "string"
            && leftExpression is Literal { Value: string leftText }
            && ConversionContext.IsReservedString(leftText)
        )
            return ExactReservedStringEquality(right, leftText, context, debugInfo);
        if (
            leftType == "string"
            && rightType == "string"
            && (IsOrdinaryStringLiteral(leftExpression) || IsOrdinaryStringLiteral(rightExpression))
        )
            return new object[] { "equals", left, right };
        if (
            (leftType == "string" || leftType == null) && IsSafeNonNumericStringLiteral(rightExpression)
            || (rightType == "string" || rightType == null) && IsSafeNonNumericStringLiteral(leftExpression)
        )
            return new object[] { "equals", left, right };
        if (
            leftType == "string"
            && rightType == "string"
            && context.HasSafeStringDomain(leftExpression)
            && context.HasSafeStringDomain(rightExpression)
        )
            return new object[] { "equals", left, right };
        if (!strict)
        {
            if (
                leftType is "number" or "boolean" && NumericStringRequiresManualConversion(rightExpression)
                || rightType is "number" or "boolean" && NumericStringRequiresManualConversion(leftExpression)
            )
                return context.Reject(
                    "Radix-prefixed and non-finite numeric strings require JavaScript-specific numeric coercion",
                    debugInfo
                );
            if (leftType == "number" && TryNumericLiteral(rightExpression, out var number))
                return ExpressionConverter.NumericEquals(left, number);
            if (rightType == "number" && TryNumericLiteral(leftExpression, out number))
                return ExpressionConverter.NumericEquals(number, right);
            if (leftType == "boolean" && TryNumericLiteral(rightExpression, out number))
                return CompareBooleanToNumber(left, number);
            if (rightType == "boolean" && TryNumericLiteral(leftExpression, out number))
                return CompareBooleanToNumber(right, number);
            if (leftType is "number" or "boolean" && rightExpression is Literal { Value: string })
                return false;
            if (rightType is "number" or "boolean" && leftExpression is Literal { Value: string })
                return false;
        }
        return context.Reject(
            "Cannot preserve JavaScript equality without compatible model types or bounded string values",
            debugInfo
        );
    }

    private static object CompareBooleanToNumber(object value, double number)
    {
        if (number.CompareTo(0d) == 0)
            return new object[] { "equals", value, false };
        if (number.CompareTo(1d) == 0)
            return new object[] { "equals", value, true };
        return false;
    }

    private static bool NumericStringRequiresManualConversion(Expression expression)
    {
        if (expression is not Literal { Value: string text })
            return false;
        var trimmed = text.Trim();
        return trimmed.StartsWith("0x", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("0b", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("0o", StringComparison.OrdinalIgnoreCase)
            || double.TryParse(trimmed, NumberStyles.Float, CultureInfo.InvariantCulture, out var number)
                && !double.IsFinite(number);
    }

    private static object? ExactReservedStringEquality(
        object subject,
        string literal,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        if (literal == "null")
            return context.Reject(
                "The dataModel expression normalizes the exact string 'null' to null before comparison",
                debugInfo
            );
        // equals casts strings and folds these words. JMESPath receives Any and preserves their case.
        return new object[] { "jmespath", subject, "@ == '" + literal + "'" };
    }

    private static bool IsSafeNonNumericStringLiteral(Expression expression) =>
        expression is Literal { Value: string text }
        && !ConversionContext.IsReservedString(text)
        && !double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out _)
        && text.Trim().Length != 0;

    private static bool IsOrdinaryStringLiteral(Expression expression) =>
        expression is Literal { Value: string text } && !ConversionContext.IsReservedString(text);

    private static bool TryNumericLiteral(Expression expression, out double value)
    {
        value = 0;
        if (expression is Literal { Value: double number })
        {
            value = number;
            return true;
        }
        if (expression is Literal { Value: string text })
            return text.Trim().Length == 0
                || double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
        if (expression is Literal { Value: bool boolean })
        {
            value = boolean ? 1 : 0;
            return true;
        }
        return false;
    }

    private static bool TryIndexOf(Expression expression, [NotNullWhen(true)] out CallExpression? call)
    {
        call = null;
        if (
            expression
            is not CallExpression
            {
                Callee: MemberExpression { Computed: false, Property: Identifier { Name: "indexOf" } }
            } candidate
        )
            return false;
        call = candidate;
        return true;
    }

    private static bool IsMinusOne(Expression expression) =>
        expression is UnaryExpression unary
        && unary.Operator.ToString() is "UnaryNegation" or "UnaryMinus" or "-"
        && unary.Argument is Literal { Value: double value }
        && value.CompareTo(1d) == 0;

    private static object? ConvertIndexOf(
        CallExpression call,
        string op,
        bool reversed,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        if (call.Arguments.Count != 1 || call.Callee is not MemberExpression member)
        {
            return context.Reject("indexOf with a starting position requires manual conversion", debugInfo);
        }
        var subject = context.ConvertExpression(member.Object, debugInfo);
        var search = context.ConvertExpression(call.Arguments[0], debugInfo);
        if (
            subject == null
            || search == null
            || context.GetValueType(member.Object) != "string"
            || !context.HasSafeStringDomain(member.Object)
            || context.GetValueType(call.Arguments[0]) != "string"
            || !context.HasSafeStringDomain(call.Arguments[0])
        )
            return context.Reject("String search text must preserve its type and reserved-value casing", debugInfo);
        var contains = new object[] { "contains", subject, search };
        // indexOf returns either -1 or a non-negative index. Reverse relational operators
        // when the call is on the right instead of treating every comparison as equality.
        if (reversed)
            op = op switch
            {
                "GreaterThan" or ">" => "LessThan",
                "LessThan" or "<" => "GreaterThan",
                "GreaterThanOrEqual" or ">=" => "LessThanOrEqual",
                "LessThanOrEqual" or "<=" => "GreaterThanOrEqual",
                _ => op,
            };
        return op switch
        {
            "Equality" or "StrictEquality" or "==" or "===" => new object[] { "not", contains },
            "Inequality" or "StrictInequality" or "!=" or "!==" => contains,
            "GreaterThan" or ">" => contains,
            "LessThan" or "<" => false,
            "GreaterThanOrEqual" or ">=" => true,
            "LessThanOrEqual" or "<=" => new object[] { "not", contains },
            _ => null,
        };
    }
}
