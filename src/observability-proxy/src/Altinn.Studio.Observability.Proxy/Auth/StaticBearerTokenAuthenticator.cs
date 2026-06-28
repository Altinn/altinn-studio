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

    public StaticBearerTokenAuthenticator(IOptionsMonitor<ObservabilityProxyOptions> options)
    {
        _options = options;
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

        foreach (var configuredToken in _options.CurrentValue.Authentication.Tokens)
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

    private static bool TokenEquals(string candidateToken, string configuredToken)
    {
        var candidateBytes = Encoding.UTF8.GetBytes(candidateToken);
        var configuredBytes = Encoding.UTF8.GetBytes(configuredToken);

        return candidateBytes.Length == configuredBytes.Length
            && CryptographicOperations.FixedTimeEquals(candidateBytes, configuredBytes);
    }
}
