using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;

internal sealed record MaskinPortenAllScopeResponse
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("description")]
    public required string Description { get; init; }

    [JsonPropertyName("allowed_integration_types")]
    public required string[] AllowedIntegrationTypes { get; init; }
}
