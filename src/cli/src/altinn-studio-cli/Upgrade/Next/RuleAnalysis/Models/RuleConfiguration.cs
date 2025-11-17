using System.Text.Json.Serialization;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

/// <summary>
/// Root structure of RuleConfiguration.json
/// </summary>
public class RuleConfiguration
{
    [JsonPropertyName("data")]
    public RuleConfigurationData? Data { get; set; }
}

/// <summary>
/// Data section containing rule connections and conditional rendering
/// </summary>
public class RuleConfigurationData
{
    [JsonPropertyName("ruleConnection")]
    public Dictionary<string, DataProcessingRule>? RuleConnection { get; set; }

    [JsonPropertyName("conditionalRendering")]
    public Dictionary<string, ConditionalRenderingRule>? ConditionalRendering { get; set; }
}
