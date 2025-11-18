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

        // Step 0.5: Strip function wrapper if present
        var cleanedFunction = StripFunctionWrapper(functionBody);
        debugInfo.Add($"Cleaned function body: {cleanedFunction.Length} characters");

        // Step 1: Parse the JavaScript
        var parseResult = _parser.ParseFunction(cleanedFunction);
        if (!parseResult.Success)
        {
            return new ConversionResult
            {
                Status = ConversionStatus.Failed,
                Confidence = ConfidenceLevel.Low,
                FailureReason = parseResult.ErrorMessage,
                DebugInfo = debugInfo,
                OriginalJavaScript = functionBody,
            };
        }

        debugInfo.Add($"Parse successful. Statement count: {parseResult.StatementCount}");

        // Step 2: Check complexity
        if (parseResult.IsComplex)
        {
            debugInfo.Add($"⚠️ Function is complex ({parseResult.StatementCount} statements)");
            warnings.Add($"Complex function with {parseResult.StatementCount} statements - may require manual review");
        }

        // Step 3: Convert the return expression
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
                Confidence = ConfidenceLevel.Low,
                FailureReason = "Could not convert return expression to expression language",
                DebugInfo = debugInfo,
                Warnings = warnings,
                OriginalJavaScript = functionBody,
            };
        }

        // Step 4: Handle Show/Hide inversion
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

        // Step 5: Determine confidence
        var confidence = DetermineConfidence(parseResult, warnings);
        debugInfo.Add($"Confidence level: {confidence}");

        return new ConversionResult
        {
            Status = ConversionStatus.Success,
            Expression = expression,
            Confidence = confidence,
            DebugInfo = debugInfo,
            Warnings = warnings,
            OriginalJavaScript = functionBody,
            WasInverted = shouldInvert,
            RequiresEnvironmentSettings = context.RequiresEnvironmentSettings,
        };
    }

    private ConfidenceLevel DetermineConfidence(ParseResult parseResult, List<string> warnings)
    {
        // Simple single-statement functions are high confidence
        if (parseResult.IsSimple && warnings.Count == 0)
            return ConfidenceLevel.High;

        // Complex functions or those with warnings are lower confidence
        if (parseResult.IsComplex || warnings.Count > 1)
            return ConfidenceLevel.Low;

        // Everything else is medium
        return ConfidenceLevel.Medium;
    }

    /// <summary>
    /// Strip the function wrapper from JavaScript function code
    /// Converts "function(obj) { ... }" to just "..."
    /// </summary>
    private string StripFunctionWrapper(string functionCode)
    {
        var trimmed = functionCode.Trim();

        // Check if it starts with "function"
        if (!trimmed.StartsWith("function", StringComparison.OrdinalIgnoreCase))
        {
            return functionCode; // Already stripped or not a function
        }

        // Find the opening brace of the function body
        var openBraceIndex = trimmed.IndexOf('{');
        if (openBraceIndex == -1)
        {
            return functionCode; // Malformed function
        }

        // Find the matching closing brace
        var closeBraceIndex = FindMatchingCloseBrace(trimmed, openBraceIndex);
        if (closeBraceIndex == -1)
        {
            return functionCode; // Malformed function
        }

        // Extract the content between braces (excluding the braces themselves)
        return trimmed.Substring(openBraceIndex + 1, closeBraceIndex - openBraceIndex - 1).Trim();
    }

    /// <summary>
    /// Find the matching closing brace for an opening brace
    /// </summary>
    private int FindMatchingCloseBrace(string code, int openBraceIndex)
    {
        var depth = 1;
        var inString = false;
        var inLineComment = false;
        var inBlockComment = false;
        var stringChar = '\0';

        for (var i = openBraceIndex + 1; i < code.Length; i++)
        {
            var c = code[i];
            var prev = i > 0 ? code[i - 1] : '\0';

            // Handle line comments
            if (!inString && !inBlockComment && prev == '/' && c == '/')
            {
                inLineComment = true;
                continue;
            }

            if (inLineComment && c == '\n')
            {
                inLineComment = false;
                continue;
            }

            if (inLineComment)
                continue;

            // Handle block comments
            if (!inString && prev == '/' && c == '*')
            {
                inBlockComment = true;
                continue;
            }

            if (inBlockComment && prev == '*' && c == '/')
            {
                inBlockComment = false;
                continue;
            }

            if (inBlockComment)
                continue;

            // Handle strings
            if ((c == '"' || c == '\'' || c == '`') && prev != '\\')
            {
                if (!inString)
                {
                    inString = true;
                    stringChar = c;
                }
                else if (c == stringChar)
                {
                    inString = false;
                }

                continue;
            }

            if (inString)
                continue;

            // Count braces
            if (c == '{')
            {
                depth++;
            }
            else if (c == '}')
            {
                depth--;
                if (depth == 0)
                {
                    return i;
                }
            }
        }

        return -1; // No matching brace found
    }
}
