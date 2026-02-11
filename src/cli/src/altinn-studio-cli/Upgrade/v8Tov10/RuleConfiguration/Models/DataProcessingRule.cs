using System.Text.Json.Serialization;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.Models;

/// <summary>
/// Represents a data processing rule (ruleConnection) from RuleConfiguration.json
/// </summary>
public class DataProcessingRule
{
    [JsonPropertyName("selectedFunction")]
    public string? SelectedFunction { get; set; }

    [JsonPropertyName("inputParams")]
    [JsonConverter(typeof(EmptyStringToNullDictionaryConverter))]
    public Dictionary<string, string>? InputParams { get; set; }

    [JsonPropertyName("outParams")]
    public Dictionary<string, string>? OutParams { get; set; }
}
