using System.Net.Http.Headers;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Maskinporten.Delegates;

/// <summary>
/// A <see cref="DelegatingHandler"/> middleware that provides authorization for all http requests.
/// </summary>
internal sealed class MaskinportenDelegatingHandler : DelegatingHandler
{
    public IEnumerable<string> Scopes { get; init; }
    internal readonly TokenAuthorities Authorities;

    private readonly ILogger<MaskinportenDelegatingHandler> _logger;
    private readonly IMaskinportenClient _maskinportenClient;

    /// <summary>
    /// Creates a new instance of <see cref="MaskinportenDelegatingHandler"/>.
    /// </summary>
    /// <param name="authorities">The token authority to authorise with</param>
    /// <param name="scopes">A list of scopes to claim authorisation for</param>
    /// <param name="maskinportenClient">A <see cref="MaskinportenClient"/> instance</param>
    /// <param name="logger">Optional logger interface</param>
    public MaskinportenDelegatingHandler(
        TokenAuthorities authorities,
        IEnumerable<string> scopes,
        IMaskinportenClient maskinportenClient,
        ILogger<MaskinportenDelegatingHandler> logger
    )
    {
        Scopes = scopes;
        _logger = logger;
        _maskinportenClient = maskinportenClient;
        Authorities = authorities;
    }

    /// <inheritdoc/>
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        _logger.LogDebug("Executing custom `SendAsync` method; injecting authentication headers");

        var token = Authorities switch
        {
            TokenAuthorities.Maskinporten => await _maskinportenClient.GetAccessToken(Scopes, cancellationToken),
            TokenAuthorities.AltinnTokenExchange => await _maskinportenClient.GetAltinnExchangedToken(
                Scopes,
                cancellationToken
            ),
            _ => throw new MaskinportenAuthenticationException($"Unknown authority `{Authorities}`"),
        };

        request.Headers.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token.Value);

        return await base.SendAsync(request, cancellationToken);
    }
}
