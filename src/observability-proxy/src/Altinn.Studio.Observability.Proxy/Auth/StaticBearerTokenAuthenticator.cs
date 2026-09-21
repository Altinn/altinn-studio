using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Altinn.Studio.Observability.Proxy.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Observability.Proxy.Auth;

internal sealed class StaticBearerTokenAuthenticator
{
    private readonly IOptionsMonitor<ObservabilityProxyOptions> _options;
    private readonly AuthTokenFile _tokenFile;

    public StaticBearerTokenAuthenticator(IOptionsMonitor<ObservabilityProxyOptions> options, AuthTokenFile tokenFile)
    {
        _options = options;
        _tokenFile = tokenFile;
    }

    public bool TryAuthenticate(string? authorizationHeader, [NotNullWhen(true)] out ObservabilitySource? source)
    {
        source = null;

        if (
            string.IsNullOrWhiteSpace(authorizationHeader)
            || !AuthenticationHeaderValue.TryParse(authorizationHeader, out var parsedHeader)
            || !string.Equals(parsedHeader.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(parsedHeader.Parameter)
        )
        {
            return false;
        }

        // Every candidate is compared even after a match, so the work does not depend on which
        // token was presented.
        foreach (var configuredToken in AcceptedTokens())
        {
            if (
                string.IsNullOrEmpty(configuredToken.Token) || string.IsNullOrWhiteSpace(configuredToken.SourceIdentity)
            )
            {
                continue;
            }

            if (TokenEquals(parsedHeader.Parameter, configuredToken.Token))
            {
                source = new ObservabilitySource(configuredToken.SourceIdentity, configuredToken.AllowedRouteGroups);
            }
        }

        return source is not null;
    }

    private IEnumerable<BearerTokenOptions> AcceptedTokens()
    {
        // The mounted Secret is the production source. Inline tokens stay for local runs and tests.
        return _tokenFile.GetTokens().Concat(_options.CurrentValue.Authentication.Tokens);
    }

    private static bool TokenEquals(string candidateToken, string configuredToken)
    {
        var candidateBytes = Encoding.UTF8.GetBytes(candidateToken);
        var configuredBytes = Encoding.UTF8.GetBytes(configuredToken);

        return candidateBytes.Length == configuredBytes.Length
            && CryptographicOperations.FixedTimeEquals(candidateBytes, configuredBytes);
    }
}
