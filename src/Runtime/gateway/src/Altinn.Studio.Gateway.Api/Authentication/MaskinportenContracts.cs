using System.Text.Json.Serialization;

namespace Altinn.Studio.Gateway.Api.Authentication;

internal sealed class OidcMetadataResponse
{
    [JsonPropertyName("issuer")]
    public required string Issuer { get; init; }

    [JsonPropertyName("token_endpoint")]
    public required string TokenEndpoint { get; init; }
}

internal sealed class MaskinportenTokenResponse
{
    [JsonPropertyName("access_token")]
    public required string AccessToken { get; init; }

    [JsonPropertyName("token_type")]
    public required string TokenType { get; init; }

    [JsonPropertyName("expires_in")]
    public required int ExpiresIn { get; init; }

    [JsonPropertyName("scope")]
    public string? Scope { get; init; }
}
