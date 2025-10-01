using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Microsoft.IdentityModel.Tokens;
using JsonWebKeyConverter = Altinn.App.Core.Features.Maskinporten.Converters.JsonWebKeyConverter;

namespace Altinn.App.Core.Features.Maskinporten.Models;

/// <summary>
/// <p>A configuration object that represents all required Maskinporten authentication settings.</p>
/// <p>Typically serialised as <c>maskinporten-settings.json</c> and injected in the runtime.</p>
/// </summary>
public sealed record MaskinportenSettings
{
    /// <summary>
    /// The Maskinporten authority/audience to use for authentication and authorization.
    /// More info about environments and URIs <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_wellknown">in the docs</a>.
    /// </summary>
    [Required]
    [JsonPropertyName("authority")]
    public required string Authority { get; set; }

    /// <summary>
    /// The client ID which has been registered with Maskinporten. Typically a uuid4 string.
    /// </summary>
    [Required]
    [JsonPropertyName("clientId")]
    public required string ClientId { get; set; }

    /// <summary>
    /// The private key used to authenticate with Maskinporten, in JWK format.
    /// </summary>
    [JsonPropertyName("jwk")]
    public JwkWrapper? Jwk { get; set; }

    /// <summary>
    /// The private key used to authenticate with Maskinporten, in Base64 encoded JWK format.
    /// </summary>
    [JsonPropertyName("jwkBase64")]
    public string? JwkBase64 { get; set; }

    private JsonWebKey? _jsonWebKey;

    /// <summary>
    /// The parsed version of <see cref="Jwk"/>/<see cref="JwkBase64"/> as a <see cref="JsonWebKey"/> instance.
    /// </summary>
    public JsonWebKey GetJsonWebKey()
    {
        if (_jsonWebKey is not null)
        {
            return _jsonWebKey;
        }

        _jsonWebKey = ConvertJwk();
        return _jsonWebKey;
    }

    /// <summary>
    /// Convert <see cref="Jwk"/>/<see cref="JwkBase64"/> to a <see cref="JsonWebKey"/> instance. Caches the result.
    /// </summary>
    internal JsonWebKey ConvertJwk()
    {
        JsonWebKey? jwk = null;

        // Got jwk
        if (Jwk is not null)
        {
            jwk = JsonWebKeyConverter.FromJwkWrapper(Jwk);
        }

        // Got possible base64 encoded string
        if (!string.IsNullOrWhiteSpace(JwkBase64))
        {
            jwk = JsonWebKeyConverter.FromBase64String(JwkBase64);
        }

        // Got nothing
        if (jwk is null)
        {
            throw new MaskinportenConfigurationException(
                $"No private key configured, neither MaskinportenSettings.{nameof(Jwk)} nor MaskinportenSettings.{nameof(JwkBase64)} was supplied."
            );
        }

        return jwk;
    }
}

/// <summary>
/// Serialization wrapper for a JsonWebKey object.
/// </summary>
public record JwkWrapper
{
    /// <summary>
    /// Key type.
    /// </summary>
    [JsonPropertyName("kty")]
    public string? Kty { get; init; }

    /// <summary>
    /// Public key usage.
    /// </summary>
    [JsonPropertyName("use")]
    public string? Use { get; init; }

    /// <summary>
    /// Key ID.
    /// </summary>
    [JsonPropertyName("kid")]
    public string? Kid { get; init; }

    /// <summary>
    /// Algorithm.
    /// </summary>
    [JsonPropertyName("alg")]
    public string? Alg { get; init; }

    /// <summary>
    /// Modulus.
    /// </summary>
    [JsonPropertyName("n")]
    public string? N { get; init; }

    /// <summary>
    /// Exponent.
    /// </summary>
    [JsonPropertyName("e")]
    public string? E { get; init; }

    /// <summary>
    /// Private exponent.
    /// </summary>
    [JsonPropertyName("d")]
    public string? D { get; init; }

    /// <summary>
    /// First prime factor.
    /// </summary>
    [JsonPropertyName("p")]
    public string? P { get; init; }

    /// <summary>
    /// Second prime factor.
    /// </summary>
    [JsonPropertyName("q")]
    public string? Q { get; init; }

    /// <summary>
    /// First CRT coefficient.
    /// </summary>
    [JsonPropertyName("qi")]
    public string? Qi { get; init; }

    /// <summary>
    /// First factor CRT exponent.
    /// </summary>
    [JsonPropertyName("dp")]
    public string? Dp { get; init; }

    /// <summary>
    /// Second factor CRT exponent.
    /// </summary>
    [JsonPropertyName("dq")]
    public string? Dq { get; init; }

    /// <summary>
    /// Validates the contents of this JWK.
    /// </summary>
    public ValidationResult Validate()
    {
        var props = new Dictionary<string, string?>
        {
            [nameof(Kty)] = Kty,
            [nameof(Use)] = Use,
            [nameof(Kid)] = Kid,
            [nameof(Alg)] = Alg,
            [nameof(N)] = N,
            [nameof(E)] = E,
            [nameof(D)] = D,
            [nameof(P)] = P,
            [nameof(Q)] = Q,
            [nameof(Qi)] = Qi,
            [nameof(Dp)] = Dp,
            [nameof(Dq)] = Dq,
        };

        return new ValidationResult
        {
            InvalidProperties = props.Where(x => string.IsNullOrWhiteSpace(x.Value)).Select(x => x.Key).ToList(),
        };
    }

    /// <summary>
    /// A <see cref="JsonWebKey"/> instance containing the component data from this record.
    /// </summary>
    public JsonWebKey ToJsonWebKey()
    {
        return new JsonWebKey
        {
            Kty = Kty,
            Use = Use,
            Kid = Kid,
            Alg = Alg,
            N = N,
            E = E,
            D = D,
            P = P,
            Q = Q,
            QI = Qi,
            DP = Dp,
            DQ = Dq,
        };
    }

    /// <summary>
    /// A record that holds the result of a <see cref="JwkWrapper.Validate"/> call.
    /// </summary>
    public readonly record struct ValidationResult
    {
        /// <summary>
        /// A collection of properties that are considered to be invalid.
        /// </summary>
        public IEnumerable<string>? InvalidProperties { get; init; }

        /// <summary>
        /// Shorthand: Is the object in a valid state?
        /// </summary>
        public bool IsValid() => InvalidProperties is null || !InvalidProperties.Any();

        /// <summary>
        /// Helpful summary of the result.
        /// </summary>
        public override string ToString()
        {
            return IsValid()
                ? "All properties are valid"
                : $"The following required properties are empty: {string.Join(", ", InvalidProperties ?? [])}";
        }
    }
}
