using Acornima.Ast;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingMatchers;

/// <summary>
/// Interface for pattern matchers that convert JavaScript AST expressions to expression language
/// </summary>
public interface IExpressionMatcher
{
    /// <summary>
    /// Checks if this matcher can handle the given expression
    /// </summary>
    bool CanMatch(Expression expression);

    /// <summary>
    /// Converts the expression to expression language format
    /// </summary>
    /// <param name="expression">The JavaScript AST expression</param>
    /// <param name="context">Context containing input parameter mappings</param>
    /// <param name="debugInfo">List to append debug information to</param>
    /// <returns>Expression language array structure, or null if conversion fails</returns>
    object? Match(Expression expression, ConversionContext context, List<string> debugInfo);
}

/// <summary>
/// Context for expression conversion containing parameter mappings and metadata
/// </summary>
public class ConversionContext
{
    /// <summary>
    /// Maps JavaScript parameter names (e.g., "value") to data model paths (e.g., "MyModel.Field.value")
    /// </summary>
    public Dictionary<string, string> InputParams { get; set; } = new();

    /// <summary>
    /// The name of the object parameter in the function (usually "obj")
    /// </summary>
    public string ObjectParameterName { get; set; } = "obj";

    /// <summary>
    /// Nested matcher chain for recursive expression conversion
    /// </summary>
    public List<IExpressionMatcher> Matchers { get; set; } = new();

    /// <summary>
    /// Flag indicating that the conversion requires environment settings to be added to the app
    /// This is set by matchers like WindowLocationMatcher when they convert environment checks
    /// </summary>
    public bool RequiresEnvironmentSettings { get; set; }

    /// <summary>
    /// Maps destructured variable names to their original property paths
    /// For example: { "summertRisiko" => "obj.summertRisiko" }
    /// </summary>
    public Dictionary<string, string> VariableMappings { get; set; } = new();

    /// <summary>
    /// Global constants extracted from the JavaScript file (e.g., var ShouldNotParticipate = 0;)
    /// Maps constant names to their literal values
    /// </summary>
    public IReadOnlyDictionary<string, object> GlobalConstants { get; set; } = new Dictionary<string, object>();

    /// <summary>
    /// Dictionary of available conditional functions for inlining cross-function calls
    /// Maps function name to its AST representation
    /// </summary>
    public Dictionary<string, Acornima.Ast.Expression> AvailableFunctions { get; set; } = new();

    /// <summary>
    /// Try to convert any expression using the matcher chain
    /// </summary>
    public object? ConvertExpression(Expression expression, List<string> debugInfo)
    {
        foreach (var matcher in Matchers)
        {
            if (matcher.CanMatch(expression))
            {
                return matcher.Match(expression, this, debugInfo);
            }
        }

        debugInfo.Add($"❌ No matcher found for expression type: {expression.GetType().Name}");
        return null;
    }
}
