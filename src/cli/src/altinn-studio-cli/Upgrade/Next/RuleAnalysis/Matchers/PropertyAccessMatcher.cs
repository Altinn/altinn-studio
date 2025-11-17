using Acornima.Ast;

namespace AltinnCLI.Upgrade.Next.RuleAnalysis.Matchers;

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

        // Extract the property path (e.g., "obj.value" -> "value")
        var propertyPath = ExtractPropertyPath(memberExpr);
        debugInfo.Add($"Extracted property path: {propertyPath}");

        // Check if this is accessing the object parameter
        if (memberExpr.Object is Identifier identifier && identifier.Name == context.ObjectParameterName)
        {
            // Get the property name
            if (memberExpr.Property is Identifier propIdentifier)
            {
                var propertyName = propIdentifier.Name;
                debugInfo.Add($"Looking up property '{propertyName}' in inputParams");

                // Map to data model path using inputParams
                if (context.InputParams.TryGetValue(propertyName, out var dataModelPath))
                {
                    debugInfo.Add($"Mapped to data model path: {dataModelPath}");
                    return new object[] { "dataModel", dataModelPath };
                }
                else
                {
                    debugInfo.Add($"⚠️ Property '{propertyName}' not found in inputParams");
                    return null;
                }
            }
        }

        debugInfo.Add($"⚠️ Could not resolve property access: {propertyPath}");
        return null;
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
