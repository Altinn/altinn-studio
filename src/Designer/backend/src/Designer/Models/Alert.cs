using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

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

public record GrafanaAlert(
    Dictionary<string, string> Labels,
    Dictionary<string, string> Annotations,
    string GeneratorURL,
    string Fingerprint);
