using System.Text.Json.Serialization;

namespace StudioGateway.Api.Models.Alerts;

internal sealed class Alert
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
    public required Uri Url { get; set; }
}
