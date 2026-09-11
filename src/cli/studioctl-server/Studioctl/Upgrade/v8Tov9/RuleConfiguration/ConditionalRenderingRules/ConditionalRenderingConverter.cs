using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Main orchestrator for converting conditional rendering rules to layout hidden expressions
/// </summary>
internal sealed class ConditionalRenderingConverter
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private readonly string _appBasePath;
    private readonly LayoutMigrationWorkspace _workspace;
    private readonly List<UpgradeMessage> _messages = [];
    private readonly HashSet<string> _layoutSetsRequiringManualWork = new(StringComparer.Ordinal);

    public ConditionalRenderingConverter(string appBasePath, LayoutMigrationWorkspace workspace)
    {
        _appBasePath = appBasePath;
        _workspace = workspace;
    }

    public MigrationResult MigrationResult => new(_messages);
    public IReadOnlySet<string> LayoutSetsRequiringManualWork => _layoutSetsRequiringManualWork;

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
        var layoutSetDirectories = Directory.GetDirectories(uiPath).Order(StringComparer.Ordinal);
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
            }
            catch (Exception ex)
            {
                _layoutSetsRequiringManualWork.Add(layoutSetName);
                _messages.Todo($"Layout set '{layoutSetName}': conditional rendering conversion failed: {ex.Message}");
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
        if (!File.Exists(ruleHandlerPath))
        {
            _messages.Todo(
                $"Layout set '{layoutSetName}': RuleHandler.js was not found, so conditional rendering rules "
                    + "could not be converted. Restore the handler or migrate the rules manually."
            );
            _layoutSetsRequiringManualWork.Add(layoutSetName);
            result.RulesProcessed = rules.Count;
            result.FailedConversions = rules.Count;
            return result;
        }
        var jsParser = new RuleHandlerParser(ruleHandlerPath);
        jsParser.Parse();

        // Initialize layout file manager
        var layoutsPath = Path.Combine(layoutSetPath, "layouts");
        if (!Directory.Exists(layoutsPath))
        {
            _messages.Todo($"Layout set '{layoutSetName}': layouts directory not found; legacy rules were kept.");
            _layoutSetsRequiringManualWork.Add(layoutSetName);
            result.RulesProcessed = rules.Count;
            result.FailedConversions = rules.Count;
            return result;
        }

        if (_workspace.HasManualConversionFileIn(layoutsPath))
        {
            _messages.Todo(
                $"Layout set '{layoutSetName}' still contains a MANUAL CONVERSION REQUIRED marker. "
                    + "Finish that expression before re-running rule conversion."
            );
            _layoutSetsRequiringManualWork.Add(layoutSetName);
            result.RulesProcessed = rules.Count;
            result.FailedConversions = rules.Count;
            return result;
        }

        if (_workspace.HasUnreadableFileIn(layoutsPath))
        {
            _messages.Todo(
                $"Layout set '{layoutSetName}' has an unreadable layout file. Conditional rendering was not "
                    + "converted because its target components cannot be checked safely; legacy rules were kept."
            );
            _layoutSetsRequiringManualWork.Add(layoutSetName);
            result.RulesProcessed = rules.Count;
            result.FailedConversions = rules.Count;
            return result;
        }

        var layoutManager = new LayoutFileManager(_workspace, layoutsPath);

        // Process each rule
        foreach (var ruleEntry in rules)
        {
            var ruleId = ruleEntry.Key;
            var rule = ruleEntry.Value;

            result.RulesProcessed++;

            // Serialize the rule configuration for context in failed conversions
            var ruleConfigJson = JsonSerializer.Serialize(rule, JsonOptions);

            var injectionResults = ProcessRule(ruleId, rule, jsParser, layoutManager, ruleConfigJson);
            if (injectionResults.Count == 0)
            {
                _layoutSetsRequiringManualWork.Add(layoutSetName);
                _messages.Todo(
                    $"Layout set '{layoutSetName}', rule '{ruleId}' has no target components. "
                        + "Review and remove or migrate the rule manually."
                );
                result.FailedConversions++;
                continue;
            }

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
                    _messages.Todo(
                        $"Layout set '{layoutSetName}', rule '{ruleId}': component "
                            + $"'{injectionResult.ComponentId}' was not found. Migrate this rule manually."
                    );
                }
                else if (injectionResult.Status == InjectionStatus.ExistingHiddenConflict)
                {
                    result.ExistingHiddenConflicts++;
                }
                else if (injectionResult.Status == InjectionStatus.ConversionFailed)
                {
                    _messages.Todo(
                        $"Layout set '{layoutSetName}', rule '{ruleId}', component "
                            + $"'{injectionResult.ComponentId}': {injectionResult.Message}. "
                            + "Replace MANUAL_CONVERSION_REQUIRED in the named layout with a valid hidden expression, "
                            + "then remove this rule from RuleConfiguration.json before rerunning."
                    );
                }
            }
        }

        if (result.FailedConversions > 0 || result.ComponentsNotFound > 0)
            _layoutSetsRequiringManualWork.Add(layoutSetName);

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
