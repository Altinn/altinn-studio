using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

public partial class ConversionContext
{
    public HashSet<string> KnownNonNullInputs { get; set; } = new(StringComparer.Ordinal);
    public HashSet<string> KnownNonZeroInputs { get; set; } = new(StringComparer.Ordinal);

    public bool IsDefinitelyNonZero(Expression expression) =>
        expression switch
        {
            Literal { Value: double number } => number != 0 && double.IsFinite(number),
            MemberExpression member => TryGetInputName(member, out var name) && KnownNonZeroInputs.Contains(name),
            _ => false,
        };

    public bool IsDefinitelyNonNull(Expression expression) =>
        expression switch
        {
            Literal literal => literal.Value != null,
            MemberExpression member => TryGetInputName(member, out var name) && KnownNonNullInputs.Contains(name),
            UnaryExpression unary when unary.Operator.ToString() is "UnaryPlus" or "+" or "UnaryNegation" or "-" =>
                true,
            BinaryExpression => true,
            _ => false,
        };

    public object? WithAssumption(Expression condition, bool truth, Func<object?> convert)
    {
        var previous = KnownNonNullInputs;
        var previousNonZero = KnownNonZeroInputs;
        KnownNonNullInputs = new(previous, StringComparer.Ordinal);
        KnownNonZeroInputs = new(previousNonZero, StringComparer.Ordinal);
        try
        {
            RecordAssumption(condition, truth);
            return convert();
        }
        finally
        {
            KnownNonNullInputs = previous;
            KnownNonZeroInputs = previousNonZero;
        }
    }

    private void RecordAssumption(Expression expression, bool truth)
    {
        if (expression is ParenthesizedExpression parentheses)
            RecordAssumption(parentheses.Expression, truth);
        if (expression is MemberExpression member && truth && TryGetInputName(member, out var name))
        {
            KnownNonNullInputs.Add(name);
            KnownNonZeroInputs.Add(name);
        }
        if (
            expression is UnaryExpression numeric
            && numeric.Operator.ToString() is "UnaryPlus" or "+"
            && GetValueType(numeric.Argument) == "number"
        )
            RecordAssumption(numeric.Argument, truth);
        if (expression is UnaryExpression unary && unary.Operator.ToString() is "LogicalNot" or "!")
            RecordAssumption(unary.Argument, !truth);
        if (expression is LogicalExpression logical && (logical.Operator.ToString() is "LogicalAnd" or "&&") == truth)
        {
            RecordAssumption(logical.Left, truth);
            RecordAssumption(logical.Right, truth);
        }
        if (expression is BinaryExpression binary && binary is not LogicalExpression)
        {
            if (truth)
                RecordRelationalAssumption(binary);
            var inequality = binary.Operator.ToString() is "Inequality" or "StrictInequality" or "!=" or "!==";
            var equality = binary.Operator.ToString() is "Equality" or "StrictEquality" or "==" or "===";
            var strict = binary.Operator.ToString() is "StrictEquality" or "StrictInequality" or "===" or "!==";
            if ((equality || inequality) && inequality == truth)
            {
                if (
                    GetValueType(binary.Left) is "null" or "undefined"
                    && !(strict && GetValueType(binary.Left) == "undefined")
                    && binary.Right is MemberExpression right
                    && TryGetInputName(right, out name)
                )
                    KnownNonNullInputs.Add(name);
                if (
                    GetValueType(binary.Right) is "null" or "undefined"
                    && !(strict && GetValueType(binary.Right) == "undefined")
                    && binary.Left is MemberExpression left
                    && TryGetInputName(left, out name)
                )
                    KnownNonNullInputs.Add(name);
            }
        }
    }

    private void RecordRelationalAssumption(BinaryExpression binary)
    {
        var function = binary.Operator.ToString() switch
        {
            "GreaterThan" or ">" => "greaterThan",
            "GreaterThanOrEqual" or ">=" => "greaterThanEq",
            "LessThan" or "<" => "lessThan",
            "LessThanOrEqual" or "<=" => "lessThanEq",
            _ => null,
        };
        if (function == null)
            return;
        // A successful bound such as amount >= 301 rules out null (coerced to 0),
        // so the following bound can safely use amount without null coercion.
        if (
            binary.Left is MemberExpression left
            && GetValueType(left) == "number"
            && BinaryComparisonMatcher.NullComparisonIsFalse(binary.Right, function, false)
            && TryGetInputName(left, out var name)
        )
        {
            KnownNonNullInputs.Add(name);
            KnownNonZeroInputs.Add(name);
        }
        if (
            binary.Right is MemberExpression right
            && GetValueType(right) == "number"
            && BinaryComparisonMatcher.NullComparisonIsFalse(binary.Left, function, true)
            && TryGetInputName(right, out name)
        )
        {
            KnownNonNullInputs.Add(name);
            KnownNonZeroInputs.Add(name);
        }
    }

    public bool GuardIsImpliedBy(Expression guard, Expression predicate, bool truth = true)
    {
        if (guard is UnaryExpression unary && unary.Operator.ToString() is "LogicalNot" or "!")
            return GuardIsImpliedBy(unary.Argument, predicate, !truth);
        if (
            predicate is not BinaryExpression comparison
            || comparison is LogicalExpression
            || comparison.Operator.ToString() is not ("Equality" or "StrictEquality" or "==" or "===")
        )
            return false;
        Expression? subject = null;
        if (comparison.Right is Literal right && IsTruthyLiteral(right))
            subject = comparison.Left;
        if (comparison.Left is Literal left && IsTruthyLiteral(left))
            subject = comparison.Right;
        if (subject == null)
            return false;
        var literal = comparison.Right as Literal ?? comparison.Left as Literal;
        if (
            literal is { Value: string text }
            && GetValueType(subject) != "string"
            && comparison.Operator.ToString() is "Equality" or "=="
            && (
                text.Trim().Length == 0
                || double.TryParse(
                    text,
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var numeric
                )
                    && numeric.CompareTo(0d) == 0
            )
        )
            return false;
        if (truth && SameInput(guard, subject))
            return true;
        return guard is BinaryExpression nullGuard
            && (
                truth
                    ? nullGuard.Operator.ToString() is "Inequality" or "StrictInequality" or "!=" or "!=="
                    : nullGuard.Operator.ToString() is "Equality" or "StrictEquality" or "==" or "==="
            )
            && (
                (SameInput(nullGuard.Left, subject) && GetValueType(nullGuard.Right) is "null" or "undefined")
                || (SameInput(nullGuard.Right, subject) && GetValueType(nullGuard.Left) is "null" or "undefined")
            );
    }

    private bool SameInput(Expression left, Expression right) =>
        left is MemberExpression first
        && right is MemberExpression second
        && TryGetInputName(first, out var firstName)
        && TryGetInputName(second, out var secondName)
        && firstName == secondName;

    private static bool IsTruthyLiteral(Literal literal) =>
        literal.Value switch
        {
            string value => value.Length != 0,
            bool value => value,
            double value => value.CompareTo(0d) != 0 && !double.IsNaN(value),
            int value => value != 0,
            long value => value != 0,
            _ => false,
        };
}
