using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Delegates;
using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Maskinporten.Extensions;

internal static class HttpClientBuilderExtensions
{
    public static IHttpClientBuilder AddMaskinportenHttpMessageHandler(
        this IHttpClientBuilder builder,
        string scope,
        IEnumerable<string> additionalScopes,
        TokenAuthority authority
    ) =>
        builder.AddMaskinportenHttpMessageHandler(
            new MaskinportenTokenRequest { Scopes = new[] { scope }.Concat(additionalScopes) },
            authority
        );

    public static IHttpClientBuilder AddMaskinportenHttpMessageHandler(
        this IHttpClientBuilder builder,
        MaskinportenTokenRequest request,
        TokenAuthority authority
    )
    {
        var factory = ActivatorUtilities.CreateFactory<MaskinportenDelegatingHandler>([
            typeof(TokenAuthority),
            typeof(MaskinportenTokenRequest),
        ]);
        return builder.AddHttpMessageHandler(provider => factory(provider, [authority, request]));
    }
}
