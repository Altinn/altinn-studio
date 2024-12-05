using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// Contains logic for handling authorisation requests with Maskinporten.
/// </summary>
public interface IMaskinportenClient
{
    /// <summary>
    /// <p>Sends an authorization request to Maskinporten and retrieves a JWT Bearer token for successful requests.</p>
    /// <p>Will cache tokens per scope, for the lifetime duration as defined in the Maskinporten token payload,
    /// which means this method is safe to call in a loop or concurrent environment without encountering rate concerns.</p>
    /// </summary>
    /// <param name="scopes">A list of scopes to claim authorization for with Maskinporten.</param>
    /// <param name="cancellationToken">An optional cancellation token to be forwarded to internal http calls.</param>
    /// <returns>A <see cref="JwtToken"/> which contains an access token, amongst other things.</returns>
    /// <exception cref="Exceptions.MaskinportenAuthenticationException">
    /// Authentication failed. This could be caused by an authentication/authorisation issue or a myriad of other circumstances.
    /// </exception>
    /// <exception cref="Exceptions.MaskinportenConfigurationException">
    /// The Maskinporten configuration is incomplete or invalid. Very possibly because of a missing or corrupt maskinporten-settings.json file.
    /// </exception>
    /// <exception cref="Exceptions.MaskinportenTokenExpiredException">The token received from Maskinporten has already expired.</exception>
    public Task<JwtToken> GetAccessToken(IEnumerable<string> scopes, CancellationToken cancellationToken = default);

    /// <summary>
    /// <p>Sends an authorization request to Maskinporten, then exchanges the grant for an Altinn issued token.</p>
    /// <p>Will cache tokens per scope, for the lifetime duration as defined in the Altinn token payload,
    /// which means this method is safe to call in a loop or concurrent environment without encountering rate concerns.</p>
    /// </summary>
    /// <param name="scopes">A list of scopes to claim authorization for with Maskinporten. These scopes will carry through to the Altinn issued token.</param>
    /// <param name="cancellationToken">An optional cancellation token to be forwarded to internal http calls.</param>
    /// <returns>A <see cref="JwtToken"/> which contains an access token, amongst other things.</returns>
    /// <exception cref="Exceptions.MaskinportenAuthenticationException">
    /// Authentication failed. This could be caused by an authentication/authorisation issue or a myriad of other circumstances.
    /// </exception>
    /// <exception cref="Exceptions.MaskinportenConfigurationException">
    /// The Maskinporten configuration is incomplete or invalid. Very possibly because of a missing or corrupt maskinporten-settings.json file.
    /// </exception>
    /// <exception cref="Exceptions.MaskinportenTokenExpiredException">The token received from Maskinporten and/or Altinn Authentication has already expired.</exception>
    /// <seealso cref="GetAccessToken"/>
    public Task<JwtToken> GetAltinnExchangedToken(
        IEnumerable<string> scopes,
        CancellationToken cancellationToken = default
    );
}
