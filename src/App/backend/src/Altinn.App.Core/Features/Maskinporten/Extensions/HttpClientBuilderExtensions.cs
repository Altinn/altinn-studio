using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Delegates;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Maskinporten.Extensions;

internal static class HttpClientBuilderExtensions
{
    public static IHttpClientBuilder AddMaskinportenHttpMessageHandler(
        this IHttpClientBuilder builder,
        string scope,
        IEnumerable<string> additionalScopes,
        TokenAuthority authority
    )
    {
        var scopes = new[] { scope }.Concat(additionalScopes);
        var factory = ActivatorUtilities.CreateFactory<MaskinportenDelegatingHandler>([
            typeof(TokenAuthority),
            typeof(IEnumerable<string>),
        ]);
        return builder.AddHttpMessageHandler(provider => factory(provider, [authority, scopes]));
    }
}
