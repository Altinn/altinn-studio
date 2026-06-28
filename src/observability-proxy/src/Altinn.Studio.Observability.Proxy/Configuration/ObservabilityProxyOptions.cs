using System.Collections.ObjectModel;

namespace Altinn.Studio.Observability.Proxy.Configuration;

internal sealed class ObservabilityProxyOptions
{
    public const string SectionName = "ObservabilityProxy";

    public string PathPrefix { get; set; } = ObservabilityPaths.DefaultPathPrefix;

    public DownstreamOptions Downstreams { get; set; } = new();

    public AuthenticationOptions Authentication { get; set; } = new();

    public RateLimitingOptions RateLimiting { get; set; } = new();
}

internal sealed class DownstreamOptions
{
    public DownstreamEndpointOptions Otlp { get; set; } = new() { Address = "http://otel-victoria-ingest:4318/" };

    public DownstreamEndpointOptions Traces { get; set; } = new() { Address = "http://victoria-traces:10428/" };

    public DownstreamEndpointOptions Metrics { get; set; } = new() { Address = "http://victoria-metrics:8428/" };
}

internal sealed class DownstreamEndpointOptions
{
    public string Address { get; set; } = string.Empty;
}

internal sealed class AuthenticationOptions
{
    public Collection<BearerTokenOptions> Tokens { get; } = [];
}

internal sealed class BearerTokenOptions
{
    public string Token { get; set; } = string.Empty;

    public string SourceIdentity { get; set; } = string.Empty;

    public Collection<string> AllowedRouteGroups { get; } = [];
}

internal sealed class RateLimitingOptions
{
    public int PermitLimit { get; set; } = 10000;

    public int WindowSeconds { get; set; } = 60;

    public int QueueLimit { get; set; }
}
