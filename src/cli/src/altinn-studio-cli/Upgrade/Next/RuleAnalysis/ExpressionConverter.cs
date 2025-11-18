using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Matchers;
using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

/// <summary>
/// Main orchestrator for converting JavaScript rule functions to expression language
/// </summary>
public class ExpressionConverter
{
    private readonly JavaScriptExpressionParser _parser;
    private readonly List<IExpressionMatcher> _matchers;

    public ExpressionConverter()
    {
        _parser = new JavaScriptExpressionParser();
        _matchers = new List<IExpressionMatcher>
        {
            // Order matters! More specific matchers should come first
            new ParenthesizedExpressionMatcher(), // Unwrap parentheses first
            new ConditionalExpressionMatcher(), // Handle ternary expressions (condition ? true : false)
            new WindowLocationMatcher(), // Check for window.location.host patterns before generic comparisons
            new LengthCheckMatcher(), // Must come before PropertyAccessMatcher
            new UnaryPlusMatcher(), // Handle numeric coercion
            new LiteralMatcher(), // Constants
            new PropertyAccessMatcher(), // Data model lookups
            new BinaryComparisonMatcher(), // Comparisons
            new LogicalOperatorMatcher(), // Boolean logic (handles multi-clause and truthiness)
        };
    }

    /// <summary>
    /// Convert a JavaScript function to an expression
    /// </summary>
    /// <param name="functionBody">The JavaScript function (may include function wrapper)</param>
    /// <param name="inputParams">Mapping of parameter names to data model paths</param>
    /// <param name="selectedAction">The action from the rule config ("Show" or "Hide")</param>
    /// <returns>Conversion result with expression or error information</returns>
    public ConversionResult Convert(string functionBody, Dictionary<string, string> inputParams, string selectedAction)
    {
        var debugInfo = new List<string>();
        var warnings = new List<string>();

        debugInfo.Add("=== Starting Conversion ===");
        debugInfo.Add($"Action: {selectedAction}");
        debugInfo.Add($"Input Parameters: {string.Join(", ", inputParams.Select(kvp => $"{kvp.Key}={kvp.Value}"))}");

        // Step 1: Parse the JavaScript function and extract its body using AST
        var parseResult = _parser.ParseFunction(functionBody);
        if (!parseResult.Success)
        {
            return new ConversionResult
            {
                Status = ConversionStatus.Failed,
                FailureReason = parseResult.ErrorMessage,
                DebugInfo = debugInfo,
                OriginalJavaScript = functionBody,
            };
        }

        // Step 2: Convert the return expression
        var context = new ConversionContext
        {
            InputParams = inputParams,
            ObjectParameterName = "obj",
            Matchers = _matchers,
        };

        debugInfo.Add("=== Converting Return Expression ===");
        var expression = context.ConvertExpression(parseResult.ReturnExpression!, debugInfo);

        if (expression == null)
        {
            return new ConversionResult
            {
                Status = ConversionStatus.Failed,
                FailureReason = "Could not convert return expression to expression language",
                DebugInfo = debugInfo,
                Warnings = warnings,
                OriginalJavaScript = functionBody,
            };
        }

        // Step 3: Handle Show/Hide inversion
        // When action is "Show", we need to invert the logic because the new API uses "hidden" property
        // Hide rules: function returns true when component should be hidden → use as-is
        // Show rules: function returns true when component should be shown → wrap in "not"
        bool shouldInvert = selectedAction.Equals("Show", StringComparison.OrdinalIgnoreCase);
        if (shouldInvert)
        {
            debugInfo.Add("Action is 'Show' - inverting expression with 'not'");
            expression = new object[] { "not", expression };
        }
        else
        {
            debugInfo.Add("Action is 'Hide' - using expression as-is");
        }

        return new ConversionResult
        {
            Status = ConversionStatus.Success,
            Expression = expression,
            DebugInfo = debugInfo,
            Warnings = warnings,
            OriginalJavaScript = functionBody,
            WasInverted = shouldInvert,
            RequiresEnvironmentSettings = context.RequiresEnvironmentSettings,
        };
    }
}
