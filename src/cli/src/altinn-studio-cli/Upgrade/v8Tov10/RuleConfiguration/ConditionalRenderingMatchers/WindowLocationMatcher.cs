using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Matches window.location.host checks and converts them to frontendSettings environment checks
/// </summary>
/// <remarks>
/// Converts patterns like:
/// - window.location.host == "local.altinn.cloud" → ["equals", ["frontendSettings", "environment"], "local"]
/// - window.location.host.endsWith("tt02.altinn.no") → ["equals", ["frontendSettings", "environment"], "staging"]
/// - Combined checks with OR or AND operators
/// </remarks>
public class WindowLocationMatcher : IExpressionMatcher
{
    // Map of domain patterns to environment names
    private static readonly Dictionary<string, string> _domainToEnvironment = new()
    {
        { "local.altinn.cloud", "local" },
        { "tt02.altinn.no", "staging" },
        { "altinn.no", "production" },
    };

    public bool CanMatch(Expression expression)
    {
        // Check for binary comparison with window.location.host
        if (expression is BinaryExpression binaryExpr)
        {
            return IsWindowLocationHostAccess(binaryExpr.Left) || IsWindowLocationHostAccess(binaryExpr.Right);
        }

        // Check for .endsWith() call on window.location.host
        if (expression is CallExpression callExpr)
        {
            return IsWindowLocationEndsWith(callExpr);
        }

        return false;
    }

    public object? Match(Expression expression, ConversionContext context, List<string> debugInfo)
    {
        // Handle binary comparison (e.g., window.location.host == "local.altinn.cloud")
        if (expression is BinaryExpression binaryExpr)
        {
            return MatchBinaryComparison(binaryExpr, context, debugInfo);
        }

        // Handle .endsWith() call (e.g., window.location.host.endsWith("tt02.altinn.no"))
        if (expression is CallExpression callExpr)
        {
            return MatchEndsWithCall(callExpr, context, debugInfo);
        }

        return null;
    }

    /// <summary>
    /// Check if expression is accessing window.location.host
    /// </summary>
    private bool IsWindowLocationHostAccess(Expression expression)
    {
        if (expression is not MemberExpression memberExpr)
            return false;

        // Check if property is "host"
        if (memberExpr.Property is not Identifier hostProp || hostProp.Name != "host")
            return false;

        // Check if object is window.location
        if (memberExpr.Object is not MemberExpression locationExpr)
            return false;

        if (locationExpr.Property is not Identifier locationProp || locationProp.Name != "location")
            return false;

        // Check if object is window
        return locationExpr.Object is Identifier windowId && windowId.Name == "window";
    }

    /// <summary>
    /// Check if expression is window.location.host.endsWith(...)
    /// </summary>
    private bool IsWindowLocationEndsWith(CallExpression callExpr)
    {
        // Check if callee is a member expression (for .endsWith())
        if (callExpr.Callee is not MemberExpression memberExpr)
            return false;

        // Check if method is "endsWith"
        if (memberExpr.Property is not Identifier methodName || methodName.Name != "endsWith")
            return false;

        // Check if object is window.location.host
        return IsWindowLocationHostAccess(memberExpr.Object);
    }

    /// <summary>
    /// Match binary comparison like window.location.host == "local.altinn.cloud"
    /// </summary>
    private object? MatchBinaryComparison(
        BinaryExpression binaryExpr,
        ConversionContext context,
        List<string> debugInfo
    )
    {
        var op = binaryExpr.Operator.ToString();

        // Only handle equality comparisons
        if (op != "==" && op != "===" && op != "Equality" && op != "StrictEquality")
        {
            debugInfo.Add($"❌ WindowLocationMatcher only handles equality comparisons, got: {op}");
            return null;
        }

        // Determine which side is window.location.host
        Expression? domainLiteral;
        if (IsWindowLocationHostAccess(binaryExpr.Left) && binaryExpr.Right is Literal)
        {
            domainLiteral = binaryExpr.Right;
        }
        else if (IsWindowLocationHostAccess(binaryExpr.Right) && binaryExpr.Left is Literal)
        {
            domainLiteral = binaryExpr.Left;
        }
        else
        {
            debugInfo.Add("❌ Could not find domain literal in window.location.host comparison");
            return null;
        }

        // Extract domain string
        var domain = (domainLiteral as Literal)?.Value as string;
        if (string.IsNullOrEmpty(domain))
        {
            debugInfo.Add("❌ Domain literal is not a string");
            return null;
        }

        // Map domain to environment
        if (!_domainToEnvironment.TryGetValue(domain, out var environment))
        {
            debugInfo.Add($"⚠️ Unknown domain '{domain}' - cannot map to environment");
            debugInfo.Add($"   Known domains: {string.Join(", ", _domainToEnvironment.Keys)}");
            return null;
        }

        debugInfo.Add($"✅ Converted window.location.host == \"{domain}\" → environment == \"{environment}\"");
        context.RequiresEnvironmentSettings = true;

        return new object[] { "equals", new object[] { "frontendSettings", "environment" }, environment };
    }

    /// <summary>
    /// Match .endsWith() call like window.location.host.endsWith("tt02.altinn.no")
    /// </summary>
    private object? MatchEndsWithCall(CallExpression callExpr, ConversionContext context, List<string> debugInfo)
    {
        if (!IsWindowLocationEndsWith(callExpr))
            return null;

        // Get the domain suffix from the first argument
        if (callExpr.Arguments.Count == 0 || callExpr.Arguments[0] is not Literal literal)
        {
            debugInfo.Add("❌ .endsWith() call missing domain suffix argument");
            return null;
        }

        var suffix = literal.Value as string;
        if (string.IsNullOrEmpty(suffix))
        {
            debugInfo.Add("❌ .endsWith() suffix is not a string");
            return null;
        }

        // Map suffix to environment
        // Look for exact match or any domain ending with this suffix
        string? environment = null;
        foreach (var kvp in _domainToEnvironment)
        {
            if (kvp.Key == suffix || kvp.Key.EndsWith(suffix, StringComparison.Ordinal))
            {
                environment = kvp.Value;
                break;
            }
        }

        if (environment == null)
        {
            debugInfo.Add($"⚠️ Unknown domain suffix '{suffix}' - cannot map to environment");
            debugInfo.Add($"   Known domains: {string.Join(", ", _domainToEnvironment.Keys)}");
            return null;
        }

        debugInfo.Add($"✅ Converted window.location.host.endsWith(\"{suffix}\") → environment == \"{environment}\"");
        context.RequiresEnvironmentSettings = true;

        return new object[] { "equals", new object[] { "frontendSettings", "environment" }, environment };
    }
}
