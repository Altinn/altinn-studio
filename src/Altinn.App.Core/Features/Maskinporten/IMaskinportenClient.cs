using Altinn.App.Core.Features.Maskinporten.Models;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// Contains logic for handling authorization requests with Maskinporten.
/// </summary>
public interface IMaskinportenClient
{
    /// <summary>
    /// <para>
    /// Sends an authorization request to Maskinporten and retrieves a JWT Bearer token for successful requests.
    /// </para>
    /// <para>
    /// Will cache tokens per scope, for the lifetime duration as defined in the token Maskinporten token payload,
    /// which means this method is safe to call in a loop or concurrent environment without encountering rate concerns.
    /// </para>
    /// </summary>
    /// <param name="scopes">A list of scopes to claim authorization for with Maskinporten.</param>
    /// <param name="cancellationToken">An optional cancellation token to be forwarded to internal http calls.</param>
    /// <returns>A <see cref="MaskinportenTokenResponse"/> which contains an access token, amongst other things.</returns>
    /// <exception cref="Maskinporten.Exceptions.MaskinportenAuthenticationException">
    /// Authentication failed. This could be caused by an authentication/authorization issue or a myriad of other circumstances.
    /// </exception>
    /// <exception cref="Maskinporten.Exceptions.MaskinportenConfigurationException">
    /// The Maskinporten configuration is incomplete or invalid. Very possibly because of a missing or corrupt maskinporten-settings.json file.
    /// </exception>
    /// <exception cref="Maskinporten.Exceptions.MaskinportenTokenExpiredException">The token received from Maskinporten has already expired.</exception>
    public Task<MaskinportenTokenResponse> GetAccessToken(
        IEnumerable<string> scopes,
        CancellationToken cancellationToken = default
    );
}
