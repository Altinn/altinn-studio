using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

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
        return memberExpr.Property is Identifier { Name: "length" };
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not MemberExpression memberExpr)
            return null;

        // Convert the object being accessed (e.g., obj.value in obj.value.length)
        var targetObject = context.ConvertExpression(memberExpr.Object, debugInfo);
        if (targetObject == null)
        {
            debugInfo.Add("❌ Failed to convert target of .length access");
            return null;
        }

        return new object[] { "stringLength", targetObject };
    }
}
