using Altinn.Studio.Observability.Proxy.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Observability.Proxy.Health;

internal sealed class ObservabilityReadinessHealthCheck : IHealthCheck
{
    private readonly IOptionsMonitor<ObservabilityProxyOptions> _options;

    public ObservabilityReadinessHealthCheck(IOptionsMonitor<ObservabilityProxyOptions> options)
    {
        _options = options;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    )
    {
        var options = _options.CurrentValue;
        if (!options.Authentication.Tokens.Any(token => IsUsableToken(token)))
        {
            return Task.FromResult(HealthCheckResult.Unhealthy("No accepted bearer tokens are configured."));
        }

        if (!IsAbsoluteHttpAddress(options.Downstreams.Otlp.Address))
        {
            return Task.FromResult(HealthCheckResult.Unhealthy("OTLP downstream address is invalid."));
        }

        if (!IsAbsoluteHttpAddress(options.Downstreams.Traces.Address))
        {
            return Task.FromResult(HealthCheckResult.Unhealthy("Traces downstream address is invalid."));
        }

        if (!IsAbsoluteHttpAddress(options.Downstreams.Metrics.Address))
        {
            return Task.FromResult(HealthCheckResult.Unhealthy("Metrics downstream address is invalid."));
        }

        return Task.FromResult(HealthCheckResult.Healthy());
    }

    private static bool IsUsableToken(BearerTokenOptions token)
    {
        return !string.IsNullOrEmpty(token.Token) && !string.IsNullOrWhiteSpace(token.SourceIdentity);
    }

    private static bool IsAbsoluteHttpAddress(string address)
    {
        return Uri.TryCreate(address, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
