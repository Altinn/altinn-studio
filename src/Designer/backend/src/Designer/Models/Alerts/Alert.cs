using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Alerts;

public class Alert
{
    [JsonPropertyName("alertId")]
    public required string AlertId { get; set; }

    [JsonPropertyName("alertRuleId")]
    public required string AlertRuleId { get; set; }

    [JsonPropertyName("type")]
    public required string Type { get; set; }

    [JsonPropertyName("app")]
    public required string App { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }
}
