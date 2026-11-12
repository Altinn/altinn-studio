using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Converts type checks after the legacy binding has normalized configured inputs to scalar values or null.
/// </summary>
public class TypeofMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression) =>
        expression is BinaryExpression binary && (IsTypeof(binary.Left) || IsTypeof(binary.Right));

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not BinaryExpression binary)
            return null;
        var op = binary.Operator.ToString();
        if (op is not ("Equality" or "StrictEquality" or "Inequality" or "StrictInequality"))
            return context.Reject("Only equality comparisons of typeof results are supported", debugInfo);
        var unary = (IsTypeof(binary.Left) ? binary.Left : binary.Right) as UnaryExpression;
        var other = IsTypeof(binary.Left) ? binary.Right : binary.Left;
        if (unary == null || other is not Literal { Value: string expected })
            return context.Reject("Expected a literal type name in a typeof comparison", debugInfo);
        var type = context.GetValueType(unary.Argument);
        if (type == null)
            return context.Reject("The typeof operand could not be resolved", debugInfo);
        object? equal;
        if (type is "undefined" or "null" or "object")
            equal = expected == (type == "null" ? "object" : type);
        else if (expected != type && expected != "object")
            equal = false;
        else if (context.IsDefinitelyNonNull(unary.Argument))
            equal = expected == type;
        else if (type == "string" && !context.HasSafeStringDomain(unary.Argument))
            return context.Reject("An unrestricted string can contain the reserved expression value 'null'", debugInfo);
        else
        {
            var value = context.ConvertExpression(unary.Argument, debugInfo);
            var function = expected == "object" ? "equals" : "notEquals";
            equal = value == null ? null : new object?[] { function, value, null };
        }
        if (equal == null)
            return null;
        return op is "Inequality" or "StrictInequality" ? new object[] { "not", equal } : equal;
    }

    private static bool IsTypeof(Expression expression) =>
        expression is UnaryExpression unary && unary.Operator.ToString() is "TypeOf" or "typeof";
}
