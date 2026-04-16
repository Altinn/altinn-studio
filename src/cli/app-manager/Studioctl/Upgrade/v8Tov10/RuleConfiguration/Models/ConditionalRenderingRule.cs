using System.Text.Json.Serialization;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.Models;

/// <summary>
/// Represents a conditional rendering rule from RuleConfiguration.json
/// </summary>
public class ConditionalRenderingRule
{
    [JsonPropertyName("selectedFunction")]
    public string? SelectedFunction { get; set; }

    [JsonPropertyName("inputParams")]
    [JsonConverter(typeof(EmptyStringToNullDictionaryConverter))]
    public Dictionary<string, string>? InputParams { get; set; }

    [JsonPropertyName("selectedAction")]
    public string? SelectedAction { get; set; }

    [JsonPropertyName("selectedFields")]
    public Dictionary<string, string>? SelectedFields { get; set; }

    [JsonPropertyName("repeatingGroup")]
    public RepeatingGroupConfig? RepeatingGroup { get; set; }
}

/// <summary>
/// Configuration for repeating groups in conditional rendering
/// </summary>
public class RepeatingGroupConfig
{
    [JsonPropertyName("groupId")]
    public string? GroupId { get; set; }

    [JsonPropertyName("childGroupId")]
    public string? ChildGroupId { get; set; }
}
