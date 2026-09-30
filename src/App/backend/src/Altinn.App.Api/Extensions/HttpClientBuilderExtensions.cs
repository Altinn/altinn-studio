using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Altinn specific extensions for <see cref="IHttpClientBuilder"/>
/// </summary>
public static class HttpClientBuilderExtensions
{
    /// <summary>
    /// <p>Authorizes all requests with Maskinporten using the provided scopes,
    /// and injects the resulting token in the Authorization header using the Bearer scheme.</p>
    /// <p>If your target API does <em>not</em> use this authorization scheme, you should consider implementing
    /// <see cref="IMaskinportenClient.GetAccessToken(IEnumerable{string}, CancellationToken)"/> directly and handling the specifics manually.</p>
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
    /// <p>Authorizes all requests with Maskinporten using the provided scopes.
    /// The resulting token is then exchanged for an Altinn issued token and injected in
    /// the Authorization header using the Bearer scheme.</p>
    /// <p>If your target API does <em>not</em> use this authorization scheme, you should consider implementing
    /// <see cref="IMaskinportenClient.GetAltinnExchangedToken(IEnumerable{string}, CancellationToken)"/> directly and handling the specifics manually.</p>
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

    /// <summary>
    /// <p>Authorizes all requests with Maskinporten using the provided token request,
    /// and injects the resulting token in the Authorization header using the Bearer scheme.</p>
    /// <p>Use this overload when the target API requires more than scopes, e.g. an audience-restricted
    /// (<c>resource</c>) or system user token.</p>
    /// </summary>
    /// <param name="builder">The Http client builder</param>
    /// <param name="request">The token request to authorize every outgoing request with</param>
    public static IHttpClientBuilder UseMaskinportenAuthorization(
        this IHttpClientBuilder builder,
        MaskinportenTokenRequest request
    )
    {
        ArgumentNullException.ThrowIfNull(request);

        return builder.AddMaskinportenHttpMessageHandler(request, TokenAuthority.Maskinporten);
    }

    /// <summary>
    /// <p>Authorizes all requests with Maskinporten using the provided token request.
    /// The resulting token is then exchanged for an Altinn issued token and injected in
    /// the Authorization header using the Bearer scheme.</p>
    /// <p>Use this overload when the target API requires more than scopes, e.g. a system user token.</p>
    /// </summary>
    /// <param name="builder">The Http client builder</param>
    /// <param name="request">The token request to authorize every outgoing request with</param>
    public static IHttpClientBuilder UseMaskinportenAltinnAuthorization(
        this IHttpClientBuilder builder,
        MaskinportenTokenRequest request
    )
    {
        ArgumentNullException.ThrowIfNull(request);

        return builder.AddMaskinportenHttpMessageHandler(request, TokenAuthority.AltinnTokenExchange);
    }
}
