using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;
using AltinnCLI.Upgrade.Next.RuleAnalysis;

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
    public void GenerateReport()
    {
        Console.WriteLine($"\nLayout Set: {_layoutSetName}");
        Console.WriteLine(new string('=', 50));

        if (_conditionalRules.Any())
        {
            GenerateConditionalRenderingReport();
        }

        if (_dataProcessingRules.Any())
        {
            GenerateDataProcessingReport();
        }

        if (!_conditionalRules.Any() && !_dataProcessingRules.Any())
        {
            Console.WriteLine("  No rules found in this layout set.");
        }
    }

    /// <summary>
    /// Generate report for conditional rendering rules, grouped by component ID
    /// </summary>
    private void GenerateConditionalRenderingReport()
    {
        Console.WriteLine("\nComponents with Conditional Rendering:");
        Console.WriteLine(new string('-', 50));

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
                if (!componentRules.ContainsKey(componentId))
                {
                    componentRules[componentId] = new List<(string, ConditionalRenderingRule)>();
                }
                componentRules[componentId].Add((ruleId, rule));
            }
        }

        // Output grouped by component
        foreach (var componentEntry in componentRules.OrderBy(c => c.Key))
        {
            var componentId = componentEntry.Key;
            var rules = componentEntry.Value;

            Console.WriteLine($"\nComponent: {componentId}");

            foreach (var (ruleId, rule) in rules)
            {
                Console.WriteLine($"  Rule: {ruleId}");
                Console.WriteLine($"    Function: {rule.SelectedFunction}");
                Console.WriteLine($"    Action: {rule.SelectedAction}");

                // Get function implementation from JS parser
                var jsFunction = _jsParser.GetConditionalFunction(rule.SelectedFunction ?? "");
                if (jsFunction != null)
                {
                    Console.WriteLine("    Original JavaScript:");
                    // Indent the function implementation
                    var lines = jsFunction.Implementation.Split('\n');
                    foreach (var line in lines)
                    {
                        Console.WriteLine($"      {line}");
                    }

                    // Try to convert to expression language
                    Console.WriteLine();
                    Console.WriteLine("    === EXPRESSION CONVERSION ===");

                    var inputParams = rule.InputParams ?? new Dictionary<string, string>();
                    var conversionResult = _expressionConverter.Convert(
                        jsFunction.Implementation,
                        inputParams,
                        rule.SelectedAction ?? "Hide"
                    );

                    // Output conversion status
                    string statusSymbol = conversionResult.Status switch
                    {
                        AltinnCLI.Upgrade.Next.RuleAnalysis.Models.ConversionStatus.Success => "✅",
                        AltinnCLI.Upgrade.Next.RuleAnalysis.Models.ConversionStatus.PartialSuccess => "⚠️",
                        AltinnCLI.Upgrade.Next.RuleAnalysis.Models.ConversionStatus.Failed => "❌",
                        _ => "?",
                    };

                    Console.WriteLine($"    Status: {statusSymbol} {conversionResult.Status}");
                    Console.WriteLine($"    Confidence: {conversionResult.Confidence}");

                    if (conversionResult.Status == AltinnCLI.Upgrade.Next.RuleAnalysis.Models.ConversionStatus.Success)
                    {
                        Console.WriteLine();
                        Console.WriteLine("    Generated Expression:");
                        var expressionJson = conversionResult.ExpressionAsJson();
                        foreach (var line in expressionJson.Split('\n'))
                        {
                            Console.WriteLine($"      {line}");
                        }

                        if (conversionResult.WasInverted)
                        {
                            Console.WriteLine("      [Note: Expression was inverted because action is 'Show']");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"    Failure Reason: {conversionResult.FailureReason}");
                    }

                    // Output warnings if any
                    if (conversionResult.Warnings.Any())
                    {
                        Console.WriteLine("    Warnings:");
                        foreach (var warning in conversionResult.Warnings)
                        {
                            Console.WriteLine($"      ⚠️ {warning}");
                        }
                    }

                    // Output debug info
                    if (conversionResult.DebugInfo.Any())
                    {
                        Console.WriteLine();
                        Console.WriteLine("    Debug Info:");
                        foreach (var debug in conversionResult.DebugInfo)
                        {
                            Console.WriteLine($"      {debug}");
                        }
                    }
                }
                else
                {
                    Console.WriteLine(
                        $"    Implementation: [Function '{rule.SelectedFunction}' not found in RuleHandler.js]"
                    );
                }

                if (rule.InputParams != null && rule.InputParams.Any())
                {
                    Console.WriteLine("    Input Parameters:");
                    foreach (var input in rule.InputParams)
                    {
                        Console.WriteLine($"      {input.Key} -> {input.Value}");
                    }
                }

                if (rule.RepeatingGroup != null)
                {
                    Console.WriteLine("    Repeating Group:");
                    Console.WriteLine($"      Group ID: {rule.RepeatingGroup.GroupId}");
                    if (!string.IsNullOrEmpty(rule.RepeatingGroup.ChildGroupId))
                    {
                        Console.WriteLine($"      Child Group ID: {rule.RepeatingGroup.ChildGroupId}");
                    }
                }

                Console.WriteLine();
            }
        }
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

            if (rule.InputParams != null && rule.InputParams.Any())
            {
                Console.WriteLine("  Inputs:");
                foreach (var input in rule.InputParams)
                {
                    Console.WriteLine($"    {input.Key} -> {input.Value}");
                }
            }

            if (rule.OutParams != null && rule.OutParams.Any())
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
