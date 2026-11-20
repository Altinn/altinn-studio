using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Auth;

/// <inheritdoc />
internal class AuthenticationTokenResolver : IAuthenticationTokenResolver
{
    private readonly IMaskinportenClient _maskinportenClient;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly ILogger<AuthenticationTokenResolver> _logger;

    public AuthenticationTokenResolver(
        IMaskinportenClient maskinportenClient,
        IAuthenticationContext authenticationContext,
        ILogger<AuthenticationTokenResolver> logger
    )
    {
        _maskinportenClient = maskinportenClient;
        _authenticationContext = authenticationContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<JwtToken> GetAccessToken(
        AuthenticationMethod authenticationMethod,
        CancellationToken cancellationToken = default
    )
    {
        // In a workflow-engine callback there is no citizen user: the ambient principal is the app's own callback token
        // (Authenticated.App via the WorkflowEngineCallback scheme). Out-of-band machinery that runs in the callback
        // need to act as the app itself rather than as a nonexistent user. Until the app gets its own identity,
        // the best option in this scenario is serviceowner authentication.
        if (
            authenticationMethod is AuthenticationMethod.UserToken
            && _authenticationContext.Current is Authenticated.App
        )
        {
            _logger.LogInformation(
                "Rewriting a CurrentUser() authentication request to ServiceOwner: running under the workflow-engine callback principal, where no user is present."
            );
            authenticationMethod = AuthenticationMethod.ServiceOwner();
        }

        return authenticationMethod switch
        {
            AuthenticationMethod.UserToken => GetCurrentUserToken(),
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
}
