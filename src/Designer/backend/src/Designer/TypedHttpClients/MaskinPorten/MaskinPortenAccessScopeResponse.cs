using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.MaskinPorten;

internal sealed record MaskinPortenAccessScopeResponse
{
    [JsonPropertyName("scope")]
    public required string Scope { get; init; }

    [JsonPropertyName("state")]
    public required string State { get; init; }
}
