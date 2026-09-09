using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// Contains logic for handling authorization requests with Maskinporten.
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
    /// <p>Sends an authorization request to Maskinporten and retrieves a JWT Bearer token for successful requests.</p>
    /// <p>This overload accepts a <see cref="MaskinportenTokenRequest"/>, which in addition to scopes carries the
    /// optional <c>consumer_org</c>, <c>resource</c> and system user (<c>authorization_details</c>) claims.</p>
    /// <p>Tokens are cached per distinct request, for the lifetime duration as defined in the Maskinporten token payload,
    /// which means this method is safe to call in a loop or concurrent environment without encountering rate concerns.</p>
    /// </summary>
    /// <param name="request">The token request.</param>
    /// <param name="cancellationToken">An optional cancellation token to be forwarded to internal http calls.</param>
    /// <returns><inheritdoc cref="GetAccessToken(IEnumerable{string}, CancellationToken)"/></returns>
    /// <exception cref="Exceptions.MaskinportenAuthenticationException">
    /// Authentication failed. This could be caused by an authentication/authorisation issue or a myriad of other circumstances.
    /// </exception>
    /// <exception cref="Exceptions.MaskinportenConfigurationException">
    /// The Maskinporten configuration is incomplete or invalid. Very possibly because of a missing or corrupt maskinporten-settings.json file.
    /// </exception>
    /// <exception cref="Exceptions.MaskinportenTokenExpiredException">The token received from Maskinporten has already expired.</exception>
    public Task<JwtToken> GetAccessToken(
        MaskinportenTokenRequest request,
        CancellationToken cancellationToken = default
    );

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
    /// <seealso cref="GetAccessToken(IEnumerable{string}, CancellationToken)"/>
    public Task<JwtToken> GetAltinnExchangedToken(
        IEnumerable<string> scopes,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// <p>Sends an authorization request to Maskinporten, then exchanges the grant for an Altinn issued token.</p>
    /// <p>This overload accepts a <see cref="MaskinportenTokenRequest"/>, which in addition to scopes carries the
    /// optional <c>consumer_org</c>, <c>resource</c> and system user (<c>authorization_details</c>) claims. Note that
    /// audience-restricting the Maskinporten token via <see cref="MaskinportenTokenRequest.Resource"/> is unlikely to
    /// be compatible with the Altinn token exchange.</p>
    /// <p>Tokens are cached per distinct request, for the lifetime duration as defined in the Altinn token payload,
    /// which means this method is safe to call in a loop or concurrent environment without encountering rate concerns.</p>
    /// </summary>
    /// <param name="request">The token request. The scopes will carry through to the Altinn issued token.</param>
    /// <param name="cancellationToken">An optional cancellation token to be forwarded to internal http calls.</param>
    /// <returns><inheritdoc cref="GetAltinnExchangedToken(IEnumerable{string}, CancellationToken)"/></returns>
    /// <exception cref="Exceptions.MaskinportenAuthenticationException">
    /// Authentication failed. This could be caused by an authentication/authorisation issue or a myriad of other circumstances.
    /// </exception>
    /// <exception cref="Exceptions.MaskinportenConfigurationException">
    /// The Maskinporten configuration is incomplete or invalid. Very possibly because of a missing or corrupt maskinporten-settings.json file.
    /// </exception>
    /// <exception cref="Exceptions.MaskinportenTokenExpiredException">The token received from Maskinporten and/or Altinn Authentication has already expired.</exception>
    /// <seealso cref="GetAccessToken(MaskinportenTokenRequest, CancellationToken)"/>
    public Task<JwtToken> GetAltinnExchangedToken(
        MaskinportenTokenRequest request,
        CancellationToken cancellationToken = default
    );
}
