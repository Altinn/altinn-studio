using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches .length property access and converts to stringLength function
/// </summary>
public class LengthCheckMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        if (expression is not MemberExpression memberExpr)
            return false;

        // Check if accessing .length property
        return !memberExpr.Computed && memberExpr.Property is Identifier { Name: "length" };
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not MemberExpression memberExpr)
            return null;

        if (context.TryGetInputName(memberExpr, out _))
            return new PropertyAccessMatcher().Match(expression, context, debugInfo);
        if (context.GetValueType(memberExpr.Object) != "string")
        {
            return context.Reject("Only string length has a matching expression operation", debugInfo);
        }
        if (!context.HasSafeStringDomain(memberExpr.Object))
        {
            return context.Reject(
                "String length requires a bounded domain because reserved text values are normalized",
                debugInfo
            );
        }

        // Convert the object being accessed (e.g., obj.value in obj.value.length)
        var targetObject = context.ConvertExpression(memberExpr.Object, debugInfo);
        if (targetObject == null)
        {
            return context.Reject("❌ Failed to convert target of .length access", debugInfo);
        }

        return new object[] { "stringLength", targetObject };
    }
}
