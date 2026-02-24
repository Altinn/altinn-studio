using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.Models;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Main orchestrator for converting conditional rendering rules to layout hidden expressions
/// </summary>
internal sealed class ConditionalRenderingConverter
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private readonly string _appBasePath;

    public ConditionalRenderingConverter(string appBasePath)
    {
        _appBasePath = appBasePath;
    }

    /// <summary>
    /// Convert all layout sets in the app
    /// </summary>
    public ConversionStatistics ConvertAllLayoutSets()
    {
        var stats = new ConversionStatistics();

        var uiPath = Path.Combine(_appBasePath, "App", "ui");
        if (!Directory.Exists(uiPath))
        {
            // Try alternative path without App/ prefix
            uiPath = Path.Combine(_appBasePath, "ui");
            if (!Directory.Exists(uiPath))
            {
                return stats; // No UI directory, nothing to convert
            }
        }

        // Enumerate all layout sets (subdirectories in ui/)
        var layoutSetDirectories = Directory.GetDirectories(uiPath);
        foreach (var layoutSetPath in layoutSetDirectories)
        {
            var layoutSetName = Path.GetFileName(layoutSetPath);

            try
            {
                var result = ConvertLayoutSet(layoutSetPath, layoutSetName);
                stats.TotalLayoutSets++;
                stats.TotalRules += result.RulesProcessed;
                stats.SuccessfulConversions += result.SuccessfulConversions;
                stats.FailedConversions += result.FailedConversions;
                stats.ComponentsNotFound += result.ComponentsNotFound;
                stats.ExistingHiddenConflicts += result.ExistingHiddenConflicts;

                // Log summary for this layout set if there were rules to process
                if (result.RulesProcessed > 0)
                {
                    Console.WriteLine(
                        $"Successfully converted {result.SuccessfulConversions} of {result.RulesProcessed} conditional rendering rules into hidden-expressions in layout-set {layoutSetName}. Please manually review the expressions and test functionality."
                    );
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error processing layout set {layoutSetName}: {ex.Message}");
            }
        }

        return stats;
    }

    /// <summary>
    /// Convert a single layout set
    /// </summary>
    private LayoutSetConversionResult ConvertLayoutSet(string layoutSetPath, string layoutSetName)
    {
        var result = new LayoutSetConversionResult { LayoutSetName = layoutSetName };

        // Check for RuleConfiguration.json
        var ruleConfigPath = Path.Combine(layoutSetPath, "RuleConfiguration.json");
        if (!File.Exists(ruleConfigPath))
        {
            return result; // No rules to process
        }

        // Parse rule files
        var configParser = new RuleConfigurationParser(ruleConfigPath);
        configParser.Parse();
        var rules = configParser.GetConditionalRenderingRules();

        if (rules.Count == 0)
        {
            return result; // No conditional rendering rules
        }

        var ruleHandlerPath = Path.Combine(layoutSetPath, "RuleHandler.js");
        RuleHandlerParser jsParser;
        try
        {
            jsParser = new RuleHandlerParser(ruleHandlerPath);
            jsParser.Parse();
        }
        catch (FileNotFoundException)
        {
            Console.Error.WriteLine($"RuleHandler.js not found for layout set {layoutSetName}, cannot convert rules");
            result.RulesProcessed = rules.Count;
            result.FailedConversions = rules.Count;
            return result;
        }

        // Initialize layout file manager
        var layoutsPath = Path.Combine(layoutSetPath, "layouts");
        if (!Directory.Exists(layoutsPath))
        {
            Console.Error.WriteLine($"Layouts directory not found for layout set {layoutSetName}: {layoutsPath}");
            result.RulesProcessed = rules.Count;
            result.FailedConversions = rules.Count;
            return result;
        }

        var layoutManager = new LayoutFileManager(layoutsPath);
        try
        {
            layoutManager.LoadLayouts();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to load layouts for {layoutSetName}: {ex.Message}");
            result.RulesProcessed = rules.Count;
            result.FailedConversions = rules.Count;
            return result;
        }

        // Process each rule
        foreach (var ruleEntry in rules)
        {
            var ruleId = ruleEntry.Key;
            var rule = ruleEntry.Value;

            result.RulesProcessed++;

            // Serialize the rule configuration for context in failed conversions
            var ruleConfigJson = JsonSerializer.Serialize(rule, JsonOptions);

            var injectionResults = ProcessRule(ruleId, rule, jsParser, layoutManager, ruleConfigJson);

            // Determine rule-level success based on component results
            bool ruleSucceeded = injectionResults.Any(r => r.Success && r.Status != InjectionStatus.ConversionFailed);
            bool ruleFailed = injectionResults.Any(r => r.Status == InjectionStatus.ConversionFailed);

            if (ruleFailed)
            {
                result.FailedConversions++;
            }
            else if (ruleSucceeded)
            {
                result.SuccessfulConversions++;
            }

            foreach (var injectionResult in injectionResults)
            {
                if (injectionResult.Status == InjectionStatus.ComponentNotFound)
                {
                    result.ComponentsNotFound++;
                    Console.Error.WriteLine(
                        $"Failed to find component '{injectionResult.ComponentId}' in layouts when converting conditional rendering rules"
                    );
                }
                else if (injectionResult.Status == InjectionStatus.ExistingHiddenConflict)
                {
                    result.ExistingHiddenConflicts++;
                }
                else if (injectionResult.Status == InjectionStatus.ConversionFailed)
                {
                    Console.Error.WriteLine(
                        $"Failed to convert rule for component '{injectionResult.ComponentId}': {injectionResult.Message}"
                    );
                }
            }
        }

        try
        {
            layoutManager.SaveLayouts();

            // Post-process to inject invalid JSON for failed conversions
            PostProcessFailedConversions(layoutsPath);

            // Restore whitespace-only changes to preserve original formatting
            try
            {
                var whitespaceRestorer = new WhitespaceRestorationProcessor(layoutsPath);
                var restorationResult = whitespaceRestorer.RestoreWhitespaceOnlyChanges();

                foreach (var warning in restorationResult.Warnings)
                {
                    Console.WriteLine($"Warning: {warning}");
                }

                foreach (var error in restorationResult.Errors)
                {
                    Console.Error.WriteLine($"Error: {error}");
                }
            }
            catch (Exception ex)
            {
                // Non-fatal: Log warning but continue
                Console.Error.WriteLine($"Warning: Could not restore whitespace formatting: {ex.Message}");
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to save layouts for {layoutSetName}: {ex.Message}");
        }

        return result;
    }

    /// <summary>
    /// Process a single rule and inject into all target components
    /// </summary>
    private List<InjectionResult> ProcessRule(
        string ruleId,
        ConditionalRenderingRule rule,
        RuleHandlerParser jsParser,
        LayoutFileManager layoutManager,
        string ruleConfigJson
    )
    {
        var results = new List<InjectionResult>();

        // Get the JavaScript function
        var functionName = rule.SelectedFunction ?? "";
        var jsFunction = jsParser.GetConditionalFunction(functionName);

        if (jsFunction == null)
        {
            // Function not found - treat as conversion failure for all components
            var failureResult = new ConversionResult
            {
                Status = ConversionStatus.Failed,
                FailureReason = $"Function '{functionName}' not found in RuleHandler.js",
            };

            foreach (var field in rule.SelectedFields ?? new Dictionary<string, string>())
            {
                // Strip legacy placeholders [{0}], [{1}], {0}, and {1} from component IDs
                var componentId = field
                    .Value.Replace("[{0}]", "")
                    .Replace("[{1}]", "")
                    .Replace("{0}", "")
                    .Replace("{1}", "");
                var injector = new ComponentHiddenExpressionInjector(layoutManager);
                var result = injector.InjectHiddenExpression(componentId, failureResult, ruleId, null, ruleConfigJson);
                results.Add(result);
            }

            return results;
        }

        // Convert to expression
        var converter = new ExpressionConverter(jsParser.GetGlobalConstants(), jsParser.GetAllConditionalFunctions());

        var conversionResult = converter.Convert(
            jsFunction.Implementation,
            rule.InputParams ?? new Dictionary<string, string>(),
            rule.SelectedAction ?? "Hide"
        );

        // Inject into each component, passing the JS function body and rule config for context
        foreach (var field in rule.SelectedFields ?? new Dictionary<string, string>())
        {
            // Strip legacy placeholders [{0}], [{1}], {0}, and {1} from component IDs
            var componentId = field
                .Value.Replace("[{0}]", "")
                .Replace("[{1}]", "")
                .Replace("{0}", "")
                .Replace("{1}", "");
            var injector = new ComponentHiddenExpressionInjector(layoutManager);
            var result = injector.InjectHiddenExpression(
                componentId,
                conversionResult,
                ruleId,
                jsFunction.Implementation,
                ruleConfigJson
            );
            results.Add(result);
        }

        return results;
    }

    /// <summary>
    /// Post-process layout files to replace placeholders with invalid JSON and add detailed comments
    /// </summary>
    private void PostProcessFailedConversions(string layoutsPath)
    {
        var jsonFiles = Directory.GetFiles(layoutsPath, "*.json");
        foreach (var filePath in jsonFiles)
        {
            var jsonText = File.ReadAllText(filePath);

            // Check if there are any failed conversions in this file
            if (!jsonText.Contains("__MANUAL_CONVERSION_REQUIRED_", StringComparison.Ordinal))
            {
                continue;
            }

            // Replace placeholders with invalid JSON and extract comment info
            var lines = jsonText.Split('\n');
            var newLines = new List<string>();

            for (int i = 0; i < lines.Length; i++)
            {
                var line = lines[i];

                // Check if this line contains a placeholder
                if (line.Contains("\"__MANUAL_CONVERSION_REQUIRED_"))
                {
                    // Extract rule ID from placeholder
                    var startIdx =
                        line.IndexOf("__MANUAL_CONVERSION_REQUIRED_", StringComparison.Ordinal)
                        + "__MANUAL_CONVERSION_REQUIRED_".Length;
                    var endIdx = line.IndexOf("__\"", startIdx, StringComparison.Ordinal);
                    var ruleId = endIdx > startIdx ? line.Substring(startIdx, endIdx - startIdx) : "unknown";

                    // Look for the _conversionFailureInfo property nearby
                    string? ruleConfig = null;
                    string? jsFunction = null;
                    for (int j = Math.Max(0, i - 10); j < Math.Min(lines.Length, i + 10); j++)
                    {
                        if (lines[j].Contains("\"_conversionFailureInfo\""))
                        {
                            // Extract the rule config and JS function from the comment
                            var ruleConfigStart = lines[j].IndexOf("Rule config: ", StringComparison.Ordinal);
                            if (ruleConfigStart > 0)
                            {
                                ruleConfigStart += "Rule config: ".Length;
                                var ruleConfigEnd = lines[j]
                                    .IndexOf(" | Original JS function: ", ruleConfigStart, StringComparison.Ordinal);
                                if (ruleConfigEnd > ruleConfigStart)
                                {
                                    ruleConfig = lines[j].Substring(ruleConfigStart, ruleConfigEnd - ruleConfigStart);

                                    var funcStart = ruleConfigEnd + " | Original JS function: ".Length;
                                    var funcEnd = lines[j].LastIndexOf('"');
                                    if (funcEnd > funcStart)
                                    {
                                        jsFunction = lines[j].Substring(funcStart, funcEnd - funcStart);
                                    }
                                }
                            }
                            break;
                        }
                    }

                    // Get indentation from current line
                    var indent = line.Substring(0, line.Length - line.TrimStart().Length);

                    // Build the multi-line comment
                    var comment = $"{indent}/* MANUAL CONVERSION REQUIRED\n";
                    comment += $"{indent}   Rule ID: {ruleId}\n";
                    if (!string.IsNullOrEmpty(ruleConfig))
                    {
                        comment += $"{indent}   \n";
                        comment += $"{indent}   Rule configuration:\n";
                        // Unescape the newlines and quotes and split into lines
                        var unescapedRuleConfig = ruleConfig
                            .Replace("\\n", "\n")
                            .Replace("\\r", "\r")
                            .Replace("\\\"", "\"");
                        var ruleConfigLines = unescapedRuleConfig.Split('\n');
                        var commentBuilder = new System.Text.StringBuilder(comment);
                        foreach (var configLine in ruleConfigLines)
                        {
                            commentBuilder.Append(
                                System.Globalization.CultureInfo.InvariantCulture,
                                $"{indent}   {configLine}\n"
                            );
                        }
                        comment = commentBuilder.ToString();
                    }
                    if (!string.IsNullOrEmpty(jsFunction))
                    {
                        comment += $"{indent}   \n";
                        comment += $"{indent}   Original JS function:\n";
                        // Unescape the newlines and quotes and split into lines
                        var unescapedJsFunction = jsFunction
                            .Replace("\\n", "\n")
                            .Replace("\\r", "\r")
                            .Replace("\\\"", "\"");
                        var jsFunctionLines = unescapedJsFunction.Split('\n');
                        var commentBuilder2 = new System.Text.StringBuilder(comment);
                        foreach (var jsLine in jsFunctionLines)
                        {
                            commentBuilder2.Append(
                                System.Globalization.CultureInfo.InvariantCulture,
                                $"{indent}   {jsLine}\n"
                            );
                        }
                        comment = commentBuilder2.ToString();
                    }
                    comment += $"{indent}   \n";
                    comment += $"{indent}   This rule could not be automatically converted to an expression.\n";
                    comment +=
                        $"{indent}   Consider implementing this logic using IDataWriteProcessor storing to a shadow field in the data model, and read from that shadow field in an expression here instead.\n";
                    comment += $"{indent}*/\n";

                    // Check if this placeholder is inside an array (has existing hidden expression)
                    // by looking at the line structure - if it's just a string value in an array, don't add the property name
                    var trimmedLine = line.TrimStart();
                    bool isArrayElement = trimmedLine.StartsWith(
                        "\"__MANUAL_CONVERSION_REQUIRED_",
                        StringComparison.Ordinal
                    );

                    if (isArrayElement)
                    {
                        // Inside an array - just add the comment and the placeholder without the property name
                        newLines.Add(comment + $"{indent}MANUAL_CONVERSION_REQUIRED");
                    }
                    else
                    {
                        // Standalone property - add the full property declaration
                        var propertyName = "hidden";
                        newLines.Add(comment + $"{indent}\"{propertyName}\": MANUAL_CONVERSION_REQUIRED");
                    }
                }
                else if (line.Contains("\"_conversionFailureInfo\""))
                {
                    // Skip this line - it was temporary storage
                }
                else
                {
                    newLines.Add(line);
                }
            }

            File.WriteAllText(filePath, string.Join("\n", newLines));
        }
    }
}

/// <summary>
/// Statistics for the overall conversion process
/// </summary>
internal sealed class ConversionStatistics
{
    public int TotalLayoutSets { get; set; }
    public int TotalRules { get; set; }
    public int SuccessfulConversions { get; set; }
    public int FailedConversions { get; set; }
    public int ComponentsNotFound { get; set; }
    public int ExistingHiddenConflicts { get; set; }
}

/// <summary>
/// Result of converting a single layout set
/// </summary>
internal sealed class LayoutSetConversionResult
{
    public string LayoutSetName { get; set; } = string.Empty;
    public int RulesProcessed { get; set; }
    public int SuccessfulConversions { get; set; }
    public int FailedConversions { get; set; }
    public int ComponentsNotFound { get; set; }
    public int ExistingHiddenConflicts { get; set; }
}
