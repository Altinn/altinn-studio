using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches standalone identifier expressions and resolves them through variable mappings
/// This handles cases like destructured variables: const { prop } = obj; return prop;
/// </summary>
public class IdentifierMatcher : IExpressionMatcher
{
    public bool CanMatch(Expression expression)
    {
        return expression is Identifier;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        if (expression is not Identifier identifier)
            return null;

        var varName = identifier.Name;

        // First, check if this identifier is a global constant
        if (context.GlobalConstants.TryGetValue(varName, out var constantValue))
        {
            debugInfo.Add($"Inlining global constant '{varName}' = {constantValue}");

            // Return the constant value as a literal
            // Convert to the appropriate type for the expression language
            return constantValue switch
            {
                int i => i,
                long l => l,
                double d => d,
                float f => f,
                string s => s,
                bool b => b,
                _ => constantValue,
            };
        }

        // Check if this identifier is a destructured variable
        if (context.VariableMappings.TryGetValue(varName, out var mappedPath))
        {
            debugInfo.Add($"Resolving destructured variable '{varName}' to '{mappedPath}'");

            // Parse the mapped path and convert it to property access
            // e.g., "obj.summertRisiko" -> ["dataModel", "summertRisiko"]
            return ConvertMappedPathToDataModel(mappedPath, context, debugInfo);
        }

        debugInfo.Add($"❌ Unresolved identifier: {varName}");
        return null;
    }

    /// <summary>
    /// Convert a mapped path like "obj.summertRisiko" to dataModel lookup
    /// </summary>
    private object? ConvertMappedPathToDataModel(string path, ConversionContext context, List<string> debugInfo)
    {
        // Split the path (e.g., "obj.summertRisiko" -> ["obj", "summertRisiko"])
        var parts = path.Split('.');
        if (parts.Length < 2)
        {
            debugInfo.Add($"❌ Invalid mapped path: {path}");
            return null;
        }

        // Skip the first part (obj) and get the property name
        var propertyName = parts[1];

        // Check if there's an input param mapping for this property
        if (context.InputParams.TryGetValue(propertyName, out var dataModelPath))
        {
            debugInfo.Add($"Mapped to data model: {dataModelPath}");
            return new object[] { "dataModel", dataModelPath };
        }

        debugInfo.Add($"❌ No input param mapping found for property: {propertyName}");
        return null;
    }
}
