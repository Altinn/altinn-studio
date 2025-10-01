using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.App.Core.Internal.Secrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Maskinporten;

/// <summary>
/// Defines the implementation of a Maskinporten token provider using JWK as the authentication method.
/// </summary>
[Obsolete(
    "Use Altinn.App.Api.ServiceCollectionExtensions.ConfigureMaskinportenClient instead. This service will be removed in V9."
)]
public class MaskinportenJwkTokenProvider : IMaskinportenTokenProvider
{
    private readonly IMaskinportenService _maskinportenService;
    private readonly MaskinportenSettings _maskinportenSettings;
    private readonly ISecretsClient _secretsClient;
    private readonly string _secretKeyName;
    private string _base64EncodedJwk = string.Empty;

    /// <summary>
    /// Creates an instance of the <see cref="MaskinportenJwkTokenProvider"/> using the provided services and settings.
    /// From the settings, the ClientId and Environment properties are used to get the token.
    /// The encoded Jwek is fetched from the secret store. Allthough possible, the Jwk should NOT be stored in the settings.
    /// Scopes defined in the settings are igonored as this is provided to the GetToken method.
    /// </summary>
    public MaskinportenJwkTokenProvider(
        IMaskinportenService maskinportenService,
        IOptions<MaskinportenSettings> maskinportenSettings,
        ISecretsClient secretsClient,
        string secretKeyName
    )
    {
        _maskinportenService = maskinportenService;
        _maskinportenSettings = maskinportenSettings.Value;
        _secretsClient = secretsClient;
        _secretKeyName = secretKeyName;
    }

    /// <summary>
    /// This will get a Maskinporten token for the provided scopes.
    /// </summary>
    public async Task<string> GetToken(string scopes)
    {
        string base64EncodedJwk = await GetBase64EncodedJwk();
        TokenResponse maskinportenToken = await _maskinportenService.GetToken(
            base64EncodedJwk,
            _maskinportenSettings.Environment,
            _maskinportenSettings.ClientId,
            scopes,
            string.Empty
        );

        return maskinportenToken.AccessToken;
    }

    /// <summary>
    /// This will first get a Maskinporten token for the provided scopes and then exchange it to an Altinn token providing addition claims.
    /// </summary>
    public async Task<string> GetAltinnExchangedToken(string scopes)
    {
        string base64EncodedJwk = await GetBase64EncodedJwk();
        TokenResponse maskinportenToken = await _maskinportenService.GetToken(
            base64EncodedJwk,
            _maskinportenSettings.Environment,
            _maskinportenSettings.ClientId,
            scopes,
            string.Empty
        );
        TokenResponse altinnToken = await _maskinportenService.ExchangeToAltinnToken(
            maskinportenToken,
            _maskinportenSettings.Environment
        );

        return altinnToken.AccessToken;
    }

    private async Task<string> GetBase64EncodedJwk()
    {
        if (string.IsNullOrEmpty(_base64EncodedJwk))
        {
            _base64EncodedJwk = await _secretsClient.GetSecretAsync(_secretKeyName);
        }

        return _base64EncodedJwk;
    }
}
