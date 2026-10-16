using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches property access expressions (e.g., obj.value, obj.field) and converts them to dataModel lookups
/// </summary>
public class PropertyAccessMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        return expression is MemberExpression;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not MemberExpression memberExpr)
            return null;

        if (context.TryGetInputName(memberExpr, out var propertyName))
        {
            if (context.InputParams.TryGetValue(propertyName, out var dataModelPath))
                return new object[] { "dataModel", dataModelPath };
            debugInfo.Add($"Unconfigured input '{propertyName}' is undefined in the legacy object");
            return new object?[] { null };
        }

        var propertyPath = ExtractPropertyPath(memberExpr);
        return context.Reject($"❌ Could not resolve property access: {propertyPath}", debugInfo);
    }

    private string ExtractPropertyPath(MemberExpression memberExpr)
    {
        var parts = new List<string>();

        var current = memberExpr;
        while (current != null)
        {
            if (current.Property is Identifier propId)
            {
                parts.Insert(0, propId.Name);
            }

            if (current.Object is Identifier objId)
            {
                parts.Insert(0, objId.Name);
                break;
            }
            else if (current.Object is MemberExpression memberObj)
            {
                current = memberObj;
            }
            else
            {
                break;
            }
        }

        return string.Join(".", parts);
    }
}
