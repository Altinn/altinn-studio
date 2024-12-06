using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;

public record MaskinPortenScope
{
    [JsonPropertyName("scope")]
    public string Scope { get; set; }

    [JsonPropertyName("state")]
    public string State { get; set; }

    [JsonPropertyName("created")]
    public string Created { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; }

    [JsonPropertyName("active")]
    public bool Active { get; set; }

    [JsonPropertyName("consumer_orgno")]
    public string ConsumerOrgNo { get; set; }

    [JsonPropertyName("last_updated")]
    public string LastUpdated { get; set; }

    [JsonPropertyName("owner_orgno")]
    public string OwnerOrgNo { get; set; }

    [JsonPropertyName("allowed_integration_types")]
    public string[] AllowedIntegrationTypes { get; set; }
}

