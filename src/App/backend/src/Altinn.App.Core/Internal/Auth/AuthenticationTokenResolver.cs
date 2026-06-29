using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Auth;

/// <inheritdoc />
internal class AuthenticationTokenResolver : IAuthenticationTokenResolver
{
    private readonly IMaskinportenClient _maskinportenClient;
    private readonly IAppMetadata _appMetadata;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAuthenticationContext _authenticationContext;

    private readonly bool _isDev;
    private readonly string _localtestBaseUrl;

    public AuthenticationTokenResolver(
        IHttpClientFactory httpClientFactory,
        IMaskinportenClient maskinportenClient,
        IAppMetadata appMetadata,
        IAuthenticationContext authenticationContext,
        RuntimeEnvironment runtimeEnvironment
    )
    {
        _maskinportenClient = maskinportenClient;
        _appMetadata = appMetadata;
        _httpClientFactory = httpClientFactory;
        _authenticationContext = authenticationContext;
        _isDev = runtimeEnvironment.IsLocaltestPlatform();
        _localtestBaseUrl = runtimeEnvironment.GetPlatformBaseUrl();
    }

    /// <inheritdoc />
    public async Task<JwtToken> GetAccessToken(
        AuthenticationMethod authenticationMethod,
        CancellationToken cancellationToken = default
    )
    {
        return authenticationMethod switch
        {
            AuthenticationMethod.UserToken => GetCurrentUserToken(),
            AuthenticationMethod.AltinnToken request when _isDev => await GetLocaltestToken(request, cancellationToken),
            AuthenticationMethod.AltinnToken request => await GetAltinnToken(request, cancellationToken),
            AuthenticationMethod.MaskinportenToken request => await GetMaskinportenToken(request, cancellationToken),
            AuthenticationMethod.CustomToken request => await request.TokenProvider.Invoke(),
            _ => throw new ArgumentException($"Invalid authentication method '{authenticationMethod.GetType().Name}'"),
        };
    }

    private async Task<JwtToken> GetMaskinportenToken(
        AuthenticationMethod.MaskinportenToken request,
        CancellationToken cancellationToken
    ) => await _maskinportenClient.GetAccessToken(request.Scopes, cancellationToken);

    private async Task<JwtToken> GetAltinnToken(
        AuthenticationMethod.AltinnToken request,
        CancellationToken cancellationToken
    ) => await _maskinportenClient.GetAltinnExchangedToken(request.Scopes, cancellationToken);

    private JwtToken GetCurrentUserToken()
    {
        var token = _authenticationContext.Current.Token;
        return JwtToken.Parse(token);
    }

    private async Task<JwtToken> GetLocaltestToken(
        AuthenticationMethod.AltinnToken request,
        CancellationToken cancellationToken
    )
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        string formattedScopes = MaskinportenClient.GetFormattedScopes(request.Scopes);
        string url =
            $"{_localtestBaseUrl}/Home/GetTestOrgToken?org={appMetadata.Org}&orgNumber=991825827&authenticationLevel=3&scopes={Uri.EscapeDataString(formattedScopes)}";

        using var client = _httpClientFactory.CreateClient();
        var response = await client.GetAsync(url, cancellationToken);

        if (!response.IsSuccessStatusCode)
            throw await PlatformHttpException.CreateAsync(response);

        string token = await response.Content.ReadAsStringAsync(cancellationToken);
        response.Dispose(); // Disposing manually because PlatformHttpException pathway requires the response to be retained

        return JwtToken.Parse(token);
    }
}
