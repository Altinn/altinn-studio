#nullable disable
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;

public record MaskinPortenScope
{
    [JsonPropertyName("prefix")]
    public string Prefix { get; set; }

    [JsonPropertyName("subscope")]
    public string Subscope { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; }

    [JsonPropertyName("long_description")]
    public string LongDescription { get; set; }

    [JsonPropertyName("active")]
    public bool Active { get; set; }

    [JsonPropertyName("allowed_integration_types")]
    public string[] AllowedIntegrationTypes { get; set; }

    /// <summary>
    /// Combined scope in format "prefix:subscope" (e.g., "altinn:broker.read")
    /// Used for deduplication and downstream processing.
    /// </summary>
    public string Scope => $"{Prefix ?? ""}:{Subscope ?? ""}";
}
