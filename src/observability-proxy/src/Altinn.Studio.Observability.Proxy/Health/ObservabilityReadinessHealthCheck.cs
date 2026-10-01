using Altinn.Studio.Observability.Proxy.Auth;
using Altinn.Studio.Observability.Proxy.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Observability.Proxy.Health;

internal sealed class ObservabilityReadinessHealthCheck : IHealthCheck
{
    private readonly IOptionsMonitor<ObservabilityProxyOptions> _options;
    private readonly AuthTokenFile _tokenFile;

    public ObservabilityReadinessHealthCheck(
        IOptionsMonitor<ObservabilityProxyOptions> options,
        AuthTokenFile tokenFile
    )
    {
        _options = options;
        _tokenFile = tokenFile;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        var options = _options.CurrentValue;

        if (!_tokenFile.GetTokens().Concat(options.Authentication.Tokens).Any(IsUsableToken))
        {
            return Unhealthy("No accepted bearer tokens are configured.");
        }

        foreach (var signal in ObservabilitySignal.All)
        {
            if (!IsAbsoluteHttpAddress(options.Downstreams.Agents.For(signal)))
            {
                return Unhealthy($"The {signal.RouteGroup} agent address is invalid.");
            }

            var storage = options.Downstreams.Storage.For(signal);
            if (storage.Count == 0)
            {
                return Unhealthy($"No {signal.RouteGroup} storage addresses are configured.");
            }

            if (!storage.All(IsAbsoluteHttpAddress))
            {
                return Unhealthy($"A {signal.RouteGroup} storage address is invalid.");
            }
        }

        return Task.FromResult(HealthCheckResult.Healthy());
    }

    private static Task<HealthCheckResult> Unhealthy(string reason)
    {
        return Task.FromResult(HealthCheckResult.Unhealthy(reason));
    }

    private static bool IsUsableToken(BearerTokenOptions token)
    {
        return !string.IsNullOrEmpty(token.Token)
            && !string.IsNullOrWhiteSpace(token.SourceIdentity)
            && token.AllowedRouteGroups.Count > 0;
    }

    private static bool IsAbsoluteHttpAddress(string address)
    {
        return Uri.TryCreate(address, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
