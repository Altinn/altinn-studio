using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.Models;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration;

/// <summary>
/// Parses RuleConfiguration.json files
/// </summary>
internal sealed class RuleConfigurationParser
{
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly string _ruleConfigPath;
    private RuleConfigurationModel? _ruleConfig;

    public RuleConfigurationParser(string ruleConfigPath)
    {
        _ruleConfigPath = ruleConfigPath;
    }

    /// <summary>
    /// Parse the RuleConfiguration.json file
    /// </summary>
    public void Parse()
    {
        if (!File.Exists(_ruleConfigPath))
        {
            throw new FileNotFoundException($"RuleConfiguration.json not found at {_ruleConfigPath}");
        }

        var jsonContent = File.ReadAllText(_ruleConfigPath);

        // Handle empty or whitespace-only files
        if (string.IsNullOrWhiteSpace(jsonContent))
        {
            _ruleConfig = null;
            return;
        }

        _ruleConfig = JsonSerializer.Deserialize<RuleConfigurationModel>(jsonContent, s_jsonOptions);
    }

    /// <summary>
    /// Get conditional rendering rules
    /// </summary>
    public Dictionary<string, ConditionalRenderingRule> GetConditionalRenderingRules()
    {
        return _ruleConfig?.Data?.ConditionalRendering ?? new Dictionary<string, ConditionalRenderingRule>();
    }

    /// <summary>
    /// Get data processing rules (ruleConnection)
    /// </summary>
    public Dictionary<string, DataProcessingRule> GetDataProcessingRules()
    {
        return _ruleConfig?.Data?.RuleConnection ?? new Dictionary<string, DataProcessingRule>();
    }
}
