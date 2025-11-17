using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

/// <summary>
/// Parses RuleConfiguration.json files
/// </summary>
internal class RuleConfigurationParser
{
    private readonly string _ruleConfigPath;
    private RuleConfiguration? _ruleConfig;

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
        _ruleConfig = JsonSerializer.Deserialize<RuleConfiguration>(
            jsonContent,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                ReadCommentHandling = JsonCommentHandling.Skip,
                AllowTrailingCommas = true,
            }
        );
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
