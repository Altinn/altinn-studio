using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Alerts;

public class Alert
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("ruleId")]
    public required string RuleId { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("app")]
    public required string App { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }
}
