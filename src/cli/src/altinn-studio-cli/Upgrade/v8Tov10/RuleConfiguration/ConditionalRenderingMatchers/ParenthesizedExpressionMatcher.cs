using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches parenthesized expressions and unwraps them
/// </summary>
public class ParenthesizedExpressionMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        return expression is ParenthesizedExpression;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not ParenthesizedExpression parenExpr)
            return null;

        debugInfo.Add("Unwrapping parenthesized expression");

        // Just convert the inner expression
        return context.ConvertExpression(parenExpr.Expression, debugInfo);
    }
}
