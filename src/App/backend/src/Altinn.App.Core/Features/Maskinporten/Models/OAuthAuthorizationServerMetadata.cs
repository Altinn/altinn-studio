using System.ComponentModel;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Maskinporten.Models;

/// <summary>
/// OAuth 2.0 Authorization Server Metadata as defined in RFC 8414.
/// </summary>
[ImmutableObject(true)]
internal sealed record OAuthAuthorizationServerMetadata
{
    /// <summary>
    /// The authorization server's issuer identifier (URL).
    /// </summary>
    [JsonPropertyName("issuer")]
    public required string Issuer { get; init; }
}
