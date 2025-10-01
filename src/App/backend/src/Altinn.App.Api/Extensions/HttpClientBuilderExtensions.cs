using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Extensions;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Altinn specific extensions for <see cref="IHttpClientBuilder"/>
/// </summary>
public static class HttpClientBuilderExtensions
{
    /// <summary>
    /// <p>Authorises all requests with Maskinporten using the provided scopes,
    /// and injects the resulting token in the Authorization header using the Bearer scheme.</p>
    /// <p>If your target API does <em>not</em> use this authorisation scheme, you should consider implementing
    /// <see cref="MaskinportenClient.GetAccessToken"/> directly and handling the specifics manually.</p>
    /// </summary>
    /// <param name="builder">The Http client builder</param>
    /// <param name="scope">The scope to claim authorization for with Maskinporten</param>
    /// <param name="additionalScopes">Additional scopes as required</param>
    public static IHttpClientBuilder UseMaskinportenAuthorization(
        this IHttpClientBuilder builder,
        string scope,
        params string[] additionalScopes
    )
    {
        return builder.AddMaskinportenHttpMessageHandler(scope, additionalScopes, TokenAuthority.Maskinporten);
    }

    /// <summary>
    /// <p>Authorises all requests with Maskinporten using the provided scopes.
    /// The resulting token is then exchanged for an Altinn issued token and injected in
    /// the Authorization header using the Bearer scheme.</p>
    /// <p>If your target API does <em>not</em> use this authorisation scheme, you should consider implementing
    /// <see cref="MaskinportenClient.GetAltinnExchangedToken(IEnumerable{string}, CancellationToken)"/> directly and handling the specifics manually.</p>
    /// </summary>
    /// <param name="builder">The Http client builder</param>
    /// <param name="scope">The scope to claim authorization for with Maskinporten</param>
    /// <param name="additionalScopes">Additional scopes as required</param>
    public static IHttpClientBuilder UseMaskinportenAltinnAuthorization(
        this IHttpClientBuilder builder,
        string scope,
        params string[] additionalScopes
    )
    {
        return builder.AddMaskinportenHttpMessageHandler(scope, additionalScopes, TokenAuthority.AltinnTokenExchange);
    }

    /// <inheritdoc cref="UseMaskinportenAuthorization"/>
    [Obsolete("Use UseMaskinportenAuthorization instead")]
    public static IHttpClientBuilder UseMaskinportenAuthorisation(
        this IHttpClientBuilder builder,
        string scope,
        params string[] additionalScopes
    ) => UseMaskinportenAuthorization(builder, scope, additionalScopes);

    /// <inheritdoc cref="UseMaskinportenAltinnAuthorization"/>
    [Obsolete("Use UseMaskinportenAltinnAuthorization instead")]
    public static IHttpClientBuilder UseMaskinportenAltinnAuthorisation(
        this IHttpClientBuilder builder,
        string scope,
        params string[] additionalScopes
    ) => UseMaskinportenAltinnAuthorization(builder, scope, additionalScopes);
}
