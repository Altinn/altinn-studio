using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.DataProcessingRules;
using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

/// <summary>
/// Statistics from analyzing rules
/// </summary>
internal class RuleAnalysisStats
{
    public int TotalConditionalRules { get; set; }
    public int TotalDataProcessingRules { get; set; }
    public int SuccessfulConversions { get; set; }
    public int FailedConversions { get; set; }
    public int SuccessfulDataProcessingConversions { get; set; }
    public int FailedDataProcessingConversions { get; set; }
    public int GeneratedProcessorFiles { get; set; }
    public bool BuildSucceeded { get; set; }
}

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
        _expressionConverter = new ExpressionConverter(
            jsParser.GetGlobalConstants(),
            jsParser.GetAllConditionalFunctions()
        );
    }

    /// <summary>
    /// Generate the report and write to console
    /// </summary>
    /// <param name="failuresOnly">Only show rules that failed to convert</param>
    /// <returns>Statistics about the analysis</returns>
    public RuleAnalysisStats GenerateReport(bool failuresOnly = false)
    {
        var stats = new RuleAnalysisStats();

        if (_conditionalRules.Count != 0)
        {
            var (output, conditionalStats) = GenerateConditionalRenderingReport(failuresOnly);
            stats = conditionalStats;

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
            var (reportOutput, _) = GenerateConditionalRenderingReport(failuresOnly);
            if (_conditionalRules.Count == 0 || string.IsNullOrEmpty(reportOutput))
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

        return stats;
    }

    /// <summary>
    /// Generate report for conditional rendering rules, grouped by component ID
    /// </summary>
    /// <param name="failuresOnly">Only show rules that failed to convert</param>
    /// <returns>The generated report output and statistics</returns>
    private (string Output, RuleAnalysisStats Stats) GenerateConditionalRenderingReport(bool failuresOnly = false)
    {
        var output = new System.Text.StringBuilder();
        var stats = new RuleAnalysisStats();

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
                if (
                    !componentRules.TryGetValue(
                        componentId,
                        out List<(string RuleId, ConditionalRenderingRule Rule)>? value
                    )
                )
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
                    Console.WriteLine(
                        $"[Warning] Rule '{ruleId}' references unknown function '{rule.SelectedFunction}'"
                    );
                    continue; // Skip if function not found
                }

                // Try to convert to expression language
                var inputParams = rule.InputParams ?? new Dictionary<string, string>();
                var conversionResult = _expressionConverter.Convert(
                    jsFunction.Implementation,
                    inputParams,
                    rule.SelectedAction ?? "Hide"
                );

                // Track statistics
                stats.TotalConditionalRules++;
                if (conversionResult.Status == ConversionStatus.Success)
                {
                    stats.SuccessfulConversions++;
                }
                else
                {
                    stats.FailedConversions++;
                }

                // Skip successful conversions if failuresOnly is true
                if (failuresOnly && conversionResult.Status == ConversionStatus.Success)
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

        return (output.ToString(), stats);
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

    /// <summary>
    /// Generate and write C# data processor files for data processing rules
    /// </summary>
    /// <param name="appBasePath">Base path to the app</param>
    /// <param name="verifyBuild">Whether to verify the build after generating files</param>
    /// <returns>Statistics about the generation</returns>
    public RuleAnalysisStats GenerateAndWriteDataProcessors(string appBasePath, bool verifyBuild = false)
    {
        var stats = new RuleAnalysisStats();

        if (_dataProcessingRules.Count == 0)
        {
            return stats;
        }

        stats.TotalDataProcessingRules = _dataProcessingRules.Count;

        // Resolve data model information
        var dataModelResolver = new DataModelResolver(appBasePath);
        dataModelResolver.LoadConfiguration();
        var dataModelInfo = dataModelResolver.GetDataModelInfo(_layoutSetName);

        if (dataModelInfo == null)
        {
            Console.WriteLine($"  Warning: Could not resolve data model for layout set '{_layoutSetName}'");
            Console.WriteLine("  Skipping C# code generation for this layout set.");
            stats.FailedDataProcessingConversions = _dataProcessingRules.Count;
            return stats;
        }

        Console.WriteLine($"\nGenerating C# Data Processor for Layout Set: {_layoutSetName}");
        Console.WriteLine(new string('-', 50));
        Console.WriteLine($"  Data Type: {dataModelInfo.DataType}");
        Console.WriteLine($"  Model Class: {dataModelInfo.FullClassRef}");

        // Generate C# code
        var generator = new CSharpCodeGenerator(_layoutSetName, dataModelInfo, _dataProcessingRules, _jsParser);
        var generationResult = generator.Generate();

        stats.SuccessfulDataProcessingConversions = generationResult.SuccessfulConversions;
        stats.FailedDataProcessingConversions = generationResult.FailedConversions;

        if (!generationResult.Success || generationResult.GeneratedCode == null || generationResult.ClassName == null)
        {
            Console.WriteLine("  Failed to generate C# code:");
            foreach (var error in generationResult.Errors)
            {
                Console.WriteLine($"    Error: {error}");
            }
            return stats;
        }

        Console.WriteLine($"  Generated class: {generationResult.ClassName}");
        Console.WriteLine(
            $"  Successfully converted: {generationResult.SuccessfulConversions}/{generationResult.TotalRules} rules"
        );

        if (generationResult.FailedConversions > 0)
        {
            Console.WriteLine(
                $"  Failed conversions: {generationResult.FailedConversions} (will require manual implementation)"
            );
        }

        // Write the file
        var fileWriter = new DataProcessorFileWriter(appBasePath);
        var filePath = fileWriter.WriteDataProcessor(generationResult.ClassName, generationResult.GeneratedCode);
        Console.WriteLine($"  Written to: {filePath}");
        stats.GeneratedProcessorFiles = 1;

        // Register in Program.cs
        var programUpdater = new ProgramCsUpdater(appBasePath);
        programUpdater.RegisterDataProcessor(generationResult.ClassName);

        // Optionally verify build
        if (verifyBuild)
        {
            Console.WriteLine("\n  Verifying build...");
            var buildVerifier = new BuildVerifier(appBasePath);
            var buildResult = buildVerifier.VerifyBuild();

            if (buildResult.Success)
            {
                Console.WriteLine("  Build succeeded!");
                stats.BuildSucceeded = true;
            }
            else
            {
                Console.WriteLine("  Build failed:");
                foreach (var error in buildResult.Errors.Take(10))
                {
                    Console.WriteLine($"    {error}");
                }

                if (buildResult.Errors.Count > 10)
                {
                    Console.WriteLine($"    ... and {buildResult.Errors.Count - 10} more errors");
                }

                stats.BuildSucceeded = false;
            }
        }

        // Show generated code preview
        Console.WriteLine("\n  Generated Code Preview:");
        Console.WriteLine(new string('-', 50));
        var codeLines = generationResult.GeneratedCode.Split('\n');
        foreach (var line in codeLines.Take(50))
        {
            Console.WriteLine($"  {line}");
        }

        if (codeLines.Length > 50)
        {
            Console.WriteLine($"  ... ({codeLines.Length - 50} more lines)");
        }

        return stats;
    }
}
