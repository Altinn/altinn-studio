using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

/// <summary>
/// Generates reports of rule analysis, grouping conditional rendering by component ID
/// </summary>
internal class RuleAnalysisReporter
{
    private readonly Dictionary<string, ConditionalRenderingRule> _conditionalRules;
    private readonly Dictionary<string, DataProcessingRule> _dataProcessingRules;
    private readonly RuleHandlerParser _jsParser;
    private readonly string _layoutSetName;
    private readonly ExpressionConverter _expressionConverter;

    public RuleAnalysisReporter(
        string layoutSetName,
        Dictionary<string, ConditionalRenderingRule> conditionalRules,
        Dictionary<string, DataProcessingRule> dataProcessingRules,
        RuleHandlerParser jsParser
    )
    {
        _layoutSetName = layoutSetName;
        _conditionalRules = conditionalRules;
        _dataProcessingRules = dataProcessingRules;
        _jsParser = jsParser;
        _expressionConverter = new ExpressionConverter();
    }

    /// <summary>
    /// Generate the report and write to console
    /// </summary>
    /// <param name="failuresOnly">Only show rules that failed to convert</param>
    public void GenerateReport(bool failuresOnly = false)
    {
        if (_conditionalRules.Count != 0)
        {
            var output = GenerateConditionalRenderingReport(failuresOnly);
            if (!string.IsNullOrEmpty(output))
            {
                // Only print layout set header if we have output
                Console.WriteLine($"\nLayout Set: {_layoutSetName}");
                Console.WriteLine(new string('=', 50));
                Console.WriteLine(output);
            }
        }

        if (_dataProcessingRules.Count != 0 && !failuresOnly)
        {
            // Data processing rules don't have conversions yet, so only show if not failures-only mode
            if (_conditionalRules.Count == 0 || string.IsNullOrEmpty(GenerateConditionalRenderingReport(failuresOnly)))
            {
                Console.WriteLine($"\nLayout Set: {_layoutSetName}");
                Console.WriteLine(new string('=', 50));
            }
            GenerateDataProcessingReport();
        }

        if (!failuresOnly && _conditionalRules.Count == 0 && _dataProcessingRules.Count == 0)
        {
            Console.WriteLine($"\nLayout Set: {_layoutSetName}");
            Console.WriteLine(new string('=', 50));
            Console.WriteLine("  No rules found in this layout set.");
        }
    }

    /// <summary>
    /// Generate report for conditional rendering rules, grouped by component ID
    /// </summary>
    /// <param name="failuresOnly">Only show rules that failed to convert</param>
    /// <returns>The generated report output, or empty string if no output</returns>
    private string GenerateConditionalRenderingReport(bool failuresOnly = false)
    {
        var output = new System.Text.StringBuilder();

        // Group rules by component ID
        var componentRules = new Dictionary<string, List<(string RuleId, ConditionalRenderingRule Rule)>>();

        foreach (var ruleEntry in _conditionalRules)
        {
            var ruleId = ruleEntry.Key;
            var rule = ruleEntry.Value;

            if (rule.SelectedFields == null)
            {
                continue;
            }

            foreach (var field in rule.SelectedFields)
            {
                var componentId = field.Value;
                if (!componentRules.TryGetValue(componentId, out List<(string RuleId, ConditionalRenderingRule Rule)>? value))
                {
                    value = new List<(string, ConditionalRenderingRule)>();
                    componentRules[componentId] = value;
                }

                value.Add((ruleId, rule));
            }
        }

        // First pass: collect all rule outputs
        var componentOutputs = new Dictionary<string, List<string>>();

        // Output grouped by component
        foreach (var componentEntry in componentRules.OrderBy(c => c.Key))
        {
            var componentId = componentEntry.Key;
            var rules = componentEntry.Value;

            var ruleOutputs = new List<string>();

            foreach (var (ruleId, rule) in rules)
            {
                // Get function implementation from JS parser
                var jsFunction = _jsParser.GetConditionalFunction(rule.SelectedFunction ?? "");
                if (jsFunction == null)
                {
                    continue; // Skip if function not found
                }

                // Try to convert to expression language
                var inputParams = rule.InputParams ?? new Dictionary<string, string>();
                var conversionResult = _expressionConverter.Convert(
                    jsFunction.Implementation,
                    inputParams,
                    rule.SelectedAction ?? "Hide"
                );

                // Skip successful conversions if failuresOnly is true
                if (
                    failuresOnly
                    && conversionResult.Status == ConversionStatus.Success
                )
                {
                    continue;
                }

                // Build the rule output
                var ruleOutput = new System.Text.StringBuilder();
                ruleOutput.AppendLine($"  Rule: {ruleId}");
                ruleOutput.AppendLine($"    Function: {rule.SelectedFunction}");
                ruleOutput.AppendLine($"    Action: {rule.SelectedAction}");
                ruleOutput.AppendLine("    Original JavaScript:");
                // Indent the function implementation
                var lines = jsFunction.Implementation.Split('\n');
                foreach (var line in lines)
                {
                    ruleOutput.AppendLine($"      {line}");
                }

                // Try to convert to expression language
                ruleOutput.AppendLine();
                ruleOutput.AppendLine("    === EXPRESSION CONVERSION ===");

                // Output conversion status
                string statusSymbol = conversionResult.Status switch
                {
                    ConversionStatus.Success => "✅",
                    ConversionStatus.Failed => "❌",
                    _ => "?",
                };

                ruleOutput.AppendLine($"    Status: {statusSymbol} {conversionResult.Status}");

                if (conversionResult.Status == ConversionStatus.Success)
                {
                    ruleOutput.AppendLine();
                    ruleOutput.AppendLine("    Generated Expression:");
                    var expressionJson = conversionResult.ExpressionAsJson();
                    foreach (var line in expressionJson.Split('\n'))
                    {
                        ruleOutput.AppendLine($"      {line}");
                    }

                    if (conversionResult.WasInverted)
                    {
                        ruleOutput.AppendLine("      [Note: Expression was inverted because action is 'Show']");
                    }

                    if (conversionResult.RequiresEnvironmentSettings)
                    {
                        ruleOutput.AppendLine("      ⚠️ [Note: This app requires environment settings to be added]");
                        ruleOutput.AppendLine(
                            "         The app must include frontendSettings with an 'environment' property"
                        );
                        ruleOutput.AppendLine("         (values: 'local', 'staging', or 'production')");
                    }
                }
                else
                {
                    ruleOutput.AppendLine($"    Failure Reason: {conversionResult.FailureReason}");
                }

                // Output warnings if any
                if (conversionResult.Warnings.Count > 0)
                {
                    ruleOutput.AppendLine("    Warnings:");
                    foreach (var warning in conversionResult.Warnings)
                    {
                        ruleOutput.AppendLine($"      ⚠️ {warning}");
                    }
                }

                // Output debug info
                if (conversionResult.DebugInfo.Count > 0)
                {
                    ruleOutput.AppendLine();
                    ruleOutput.AppendLine("    Debug Info:");
                    foreach (var debug in conversionResult.DebugInfo)
                    {
                        ruleOutput.AppendLine($"      {debug}");
                    }
                }

                if (rule.InputParams != null && rule.InputParams.Count > 0)
                {
                    ruleOutput.AppendLine("    Input Parameters:");
                    foreach (var input in rule.InputParams)
                    {
                        ruleOutput.AppendLine($"      {input.Key} -> {input.Value}");
                    }
                }

                if (rule.RepeatingGroup != null)
                {
                    ruleOutput.AppendLine("    Repeating Group:");
                    ruleOutput.AppendLine($"      Group ID: {rule.RepeatingGroup.GroupId}");
                    if (!string.IsNullOrEmpty(rule.RepeatingGroup.ChildGroupId))
                    {
                        ruleOutput.AppendLine($"      Child Group ID: {rule.RepeatingGroup.ChildGroupId}");
                    }
                }

                ruleOutput.AppendLine();
                ruleOutputs.Add(ruleOutput.ToString());
            }

            // Add component output if we have any rules for it
            if (ruleOutputs.Count > 0)
            {
                componentOutputs[componentId] = ruleOutputs;
            }
        }

        // Build final output
        if (componentOutputs.Count > 0)
        {
            output.AppendLine("\nComponents with Conditional Rendering:");
            output.AppendLine(new string('-', 50));

            foreach (var kvp in componentOutputs.OrderBy(c => c.Key))
            {
                output.AppendLine($"\nComponent: {kvp.Key}");
                foreach (var ruleOut in kvp.Value)
                {
                    output.Append(ruleOut);
                }
            }
        }

        return output.ToString();
    }

    /// <summary>
    /// Generate report for data processing rules
    /// </summary>
    private void GenerateDataProcessingReport()
    {
        Console.WriteLine("\nData Processing Rules:");
        Console.WriteLine(new string('-', 50));

        foreach (var ruleEntry in _dataProcessingRules)
        {
            var ruleId = ruleEntry.Key;
            var rule = ruleEntry.Value;

            Console.WriteLine($"\nRule: {ruleId}");
            Console.WriteLine($"  Function: {rule.SelectedFunction}");

            // Get function implementation from JS parser
            var jsFunction = _jsParser.GetDataProcessingFunction(rule.SelectedFunction ?? "");
            if (jsFunction != null)
            {
                Console.WriteLine("  Implementation:");
                var lines = jsFunction.Implementation.Split('\n');
                foreach (var line in lines)
                {
                    Console.WriteLine($"    {line}");
                }
            }
            else
            {
                Console.WriteLine(
                    $"  Implementation: [Function '{rule.SelectedFunction}' not found in RuleHandler.js]"
                );
            }

            if (rule.InputParams != null && rule.InputParams.Count != 0)
            {
                Console.WriteLine("  Inputs:");
                foreach (var input in rule.InputParams)
                {
                    Console.WriteLine($"    {input.Key} -> {input.Value}");
                }
            }

            if (rule.OutParams != null && rule.OutParams.Count != 0)
            {
                Console.WriteLine("  Outputs:");
                foreach (var output in rule.OutParams)
                {
                    Console.WriteLine($"    {output.Key} -> {output.Value}");
                }
            }

            Console.WriteLine();
        }
    }
}
