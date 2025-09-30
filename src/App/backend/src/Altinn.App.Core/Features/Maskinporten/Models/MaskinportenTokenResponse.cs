using System.Text.Json.Serialization;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Maskinporten.Models;

/// <summary>
/// The response received from Maskinporten after a successful grant request.
/// </summary>
internal sealed record MaskinportenTokenResponse
{
    /// <summary>
    /// The JWT access token to be used for authorisation of http requests.
    /// </summary>
    [JsonPropertyName("access_token")]
    [JsonConverter(typeof(JwtTokenJsonConverter))]
    public required JwtToken AccessToken { get; init; }

    /// <summary>
    /// The type of JWT received. In this context, the value is always <c>Bearer</c>.
    /// </summary>
    [JsonPropertyName("token_type")]
    public required string TokenType { get; init; }

    /// <summary>
    /// The number of seconds until token expiry. Typically set to 120 = 2 minutes.
    /// </summary>
    [JsonPropertyName("expires_in")]
    public required int ExpiresIn { get; init; }

    /// <summary>
    /// The scope(s) associated with the authorization token (<see cref="AccessToken"/>).
    /// </summary>
    [JsonPropertyName("scope")]
    public required string Scope { get; init; }

    /// <summary>
    /// Stringifies the content of this instance, while masking the JWT signature part of <see cref="AccessToken"/>.
    /// </summary>
    public override string ToString()
    {
        return $"{nameof(AccessToken)}: {AccessToken}, {nameof(TokenType)}: {TokenType}, {nameof(Scope)}: {Scope}, {nameof(ExpiresIn)}: {ExpiresIn}";
    }
}
