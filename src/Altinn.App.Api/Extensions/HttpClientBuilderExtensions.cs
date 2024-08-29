using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Delegates;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Altinn specific extensions for <see cref="IHttpClientBuilder"/>
/// </summary>
public static class HttpClientBuilderExtensions
{
    /// <summary>
    /// <para>
    /// Sets up a <see cref="MaskinportenDelegatingHandler"/> middleware for the supplied <see cref="HttpClient"/>,
    /// which will inject an Authorization header with a Bearer token for all requests.
    /// </para>
    /// <para>
    /// If your target API does <em>not</em> use this authentication scheme, you should consider implementing
    /// <see cref="MaskinportenClient.GetAccessToken"/> directly and handling authorization details manually.
    /// </para>
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
        var scopes = new[] { scope }.Concat(additionalScopes);
        var factory = ActivatorUtilities.CreateFactory<MaskinportenDelegatingHandler>([typeof(IEnumerable<string>),]);
        return builder.AddHttpMessageHandler(provider => factory(provider, [scopes]));
    }
}
