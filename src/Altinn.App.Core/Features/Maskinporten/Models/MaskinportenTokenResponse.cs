using System.ComponentModel;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Altinn.App.Core.Features.Maskinporten.Models;

/// <summary>
/// The response received from Maskinporten after a successful grant request.
/// </summary>
[ImmutableObject(true)]
public sealed partial record MaskinportenTokenResponse
{
    private static readonly Regex _jwtStructurePattern = JwtRegexFactory();

    /// <summary>
    /// The JWT access token to be used in the Authorization header for downstream requests.
    /// </summary>
    [JsonPropertyName("access_token")]
    public required string AccessToken { get; init; }

    /// <summary>
    /// The type of JWT received. In this context, the value is always `Bearer`.
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
    /// Convenience conversion of <see cref="ExpiresIn"/> to an actual instant in time.
    /// </summary>
    public DateTime ExpiresAt => _createdAt.AddSeconds(ExpiresIn);

    /// <summary>
    /// Internal tracker used by <see cref="ExpiresAt"/> to calculate an expiry <see cref="DateTime"/>.
    /// </summary>
    private readonly DateTime _createdAt = DateTime.UtcNow;

    /// <summary>
    /// Is the token expired?
    /// </summary>
    public bool IsExpired()
    {
        return ExpiresAt < DateTime.UtcNow;
    }

    /// <summary>
    /// Stringifies the content of this instance, while masking the JWT signature part of <see cref="AccessToken"/>
    /// </summary>
    public override string ToString()
    {
        var accessTokenMatch = _jwtStructurePattern.Match(AccessToken);
        var maskedToken = accessTokenMatch.Success
            ? $"{accessTokenMatch.Groups[1]}.{accessTokenMatch.Groups[2]}.xxx"
            : "<masked>";
        return $"{nameof(AccessToken)}: {maskedToken}, {nameof(TokenType)}: {TokenType}, {nameof(Scope)}: {Scope}, {nameof(ExpiresIn)}: {ExpiresIn}, {nameof(ExpiresAt)}: {ExpiresAt}";
    }

    [GeneratedRegex(@"^(.+)\.(.+)\.(.+)$", RegexOptions.Multiline)]
    private static partial Regex JwtRegexFactory();
}
