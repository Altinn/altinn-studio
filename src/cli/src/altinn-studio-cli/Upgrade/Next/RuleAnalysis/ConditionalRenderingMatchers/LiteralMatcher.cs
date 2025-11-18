using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.ConditionalRenderingMatchers;

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
        if (expression is Identifier identifier && identifier.Name == "undefined")
            return true;

        return false;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        // Handle undefined identifier (treat as null)
        if (expression is Identifier identifier && identifier.Name == "undefined")
        {
            // Wrap null in an array so it's distinguishable from "conversion failed"
            return new object?[] { null };
        }

        if (expression is not Literal literal)
            return null;

        // Handle null literal - wrap it so it's distinguishable from "conversion failed"
        if (literal.Value == null)
        {
            return new object?[] { null };
        }

        // Return the literal value directly
        // Expression language uses JSON-compatible primitives
        return literal.Value;
    }
}
