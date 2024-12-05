using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Features.Maskinporten.Converters;

/// <summary>
/// Utility class that facilitates <see cref="JsonWebKey"/> conversion.
/// </summary>
internal static class JsonWebKeyConverter
{
    /// <summary>
    /// Creates a <see cref="JsonWebKey"/> instance from the supplied <see cref="MaskinportenSettings.Jwk"/> object.
    /// </summary>
    public static JsonWebKey FromJwkWrapper(JwkWrapper jwk)
    {
        // Validate
        var validationResult = jwk.Validate();
        if (!validationResult.IsValid())
        {
            throw new MaskinportenConfigurationException(
                $"The MaskinportenSettings.{nameof(MaskinportenSettings.Jwk)} JsonWebKey is invalid after deserialization, not all required properties were found: {validationResult}"
            );
        }

        return jwk.ToJsonWebKey();
    }

    /// <summary>
    /// Creates a <see cref="JsonWebKey"/> instance from the supplied <see cref="MaskinportenSettings.JwkBase64"/> object.
    /// </summary>
    public static JsonWebKey FromBase64String(string jwkBase64)
    {
        JwkWrapper jwk;
        try
        {
            string decoded = Encoding.UTF8.GetString(System.Convert.FromBase64String(jwkBase64));
            var deserialized =
                JsonSerializer.Deserialize<JwkWrapper>(decoded)
                ?? throw new MaskinportenConfigurationException(
                    $"Literal null value for property MaskinportenSettings.{nameof(MaskinportenSettings.JwkBase64)}."
                );
            jwk = deserialized;
        }
        catch (JsonException e)
        {
            throw new MaskinportenConfigurationException(
                $"Error parsing MaskinportenSettings.{nameof(MaskinportenSettings.JwkBase64)} JSON structure: {e.Message}",
                e
            );
        }
        catch (Exception e)
        {
            throw new MaskinportenConfigurationException(
                $"Error decoding MaskinportenSettings.{nameof(MaskinportenSettings.JwkBase64)} from base64: {e.Message}",
                e
            );
        }

        // Validate
        var validationResult = jwk.Validate();
        if (!validationResult.IsValid())
        {
            throw new MaskinportenConfigurationException(
                $"The MaskinportenSettings.{nameof(MaskinportenSettings.Jwk)} JsonWebKey is invalid after deserialization, not all required properties were found: {validationResult}"
            );
        }

        return jwk.ToJsonWebKey();
    }
}
