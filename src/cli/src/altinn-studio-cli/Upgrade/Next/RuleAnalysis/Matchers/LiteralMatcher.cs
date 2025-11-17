using Acornima.Ast;

namespace AltinnCLI.Upgrade.Next.RuleAnalysis.Matchers;

/// <summary>
/// Matches literal values (strings, numbers, booleans, null)
/// </summary>
public class LiteralMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        return expression is Literal;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not Literal literal)
            return null;

        var value = literal.Value;
        debugInfo.Add($"Literal value: {value} (type: {value?.GetType().Name ?? "null"})");

        // Return the literal value directly
        // Expression language uses JSON-compatible primitives
        return value;
    }
}
