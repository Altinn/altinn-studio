using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Detects truthiness checks in AND expressions and converts them to null checks
/// E.g., "obj.value &amp;&amp; obj.value === 'foo'" becomes ["and", ["notEquals", value, null], ["equals", value, "foo"]]
/// </summary>
public class TruthinessCheckMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        // We handle this in the LogicalOperatorMatcher by detecting property access on left side of &&
        return false; // Not used as a standalone matcher
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        // Not used - this is a helper method called by LogicalOperatorMatcher
        return null;
    }

    /// <summary>
    /// Check if an expression is a simple truthiness check (property access without comparison)
    /// </summary>
    public static bool IsTruthinessCheck(Expression expression)
    {
        // Check if it's a member expression (property access) without any comparison
        // E.g., "obj.value" by itself (not "obj.value === something")
        return expression is MemberExpression;
    }

    /// <summary>
    /// Convert a truthiness check to a null check
    /// E.g., "obj.value" becomes ["notEquals", ["dataModel", "path"], null]
    /// </summary>
    public static object? ConvertTruthinessCheck(
        Expression expression,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        // Convert the property access
        var propertyValue = context.ConvertExpression(expression, debugInfo);
        if (propertyValue == null)
        {
            debugInfo.Add("❌ Failed to convert property in truthiness check");
            return null;
        }

        // Return a notEquals null check
        // ! null literal is intentionally used as the comparison value in the expression
        return new object[] { "notEquals", propertyValue, null! };
    }
}
