using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches literal values (strings, numbers, booleans, null) and undefined identifier
/// </summary>
public class LiteralMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        // Match literal values
        if (expression is Literal)
            return true;

        // Also match 'undefined' identifier (treat as null synonym)
        return expression is Identifier { Name: "undefined" };
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        // Handle undefined identifier (treat as null)
        if (expression is Identifier { Name: "undefined" })
        {
            // Wrap null in an array so it's distinguishable from "conversion failed"
            return new object?[] { null };
        }

        if (expression is not Literal literal)
            return null;

        return literal.Value ?? new object?[] { null };
    }
}
