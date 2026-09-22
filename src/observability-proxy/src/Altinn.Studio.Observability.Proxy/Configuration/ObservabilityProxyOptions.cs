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
    /// <summary>
    /// OTLP writes go to the agent for the signal. Each agent runs two replicas behind one Service,
    /// so one address per signal is enough and Kubernetes spreads the load.
    /// </summary>
    public AgentDownstreamOptions Agents { get; set; } = new();

    /// <summary>
    /// Reads go to the storage pair. Both instances hold a full copy, and neither can merge results
    /// with the other, so these are failover destinations rather than a load-balanced set.
    /// </summary>
    public StorageDownstreamOptions Storage { get; set; } = new();
}

internal sealed class AgentDownstreamOptions
{
    public string Traces { get; set; } = string.Empty;

    public string Metrics { get; set; } = string.Empty;

    public string Logs { get; set; } = string.Empty;

    public string For(ObservabilitySignal signal)
    {
        ArgumentNullException.ThrowIfNull(signal);

        return signal.RouteGroup switch
        {
            ObservabilityPaths.TracesRouteGroup => Traces,
            ObservabilityPaths.MetricsRouteGroup => Metrics,
            _ => Logs,
        };
    }
}

internal sealed class StorageDownstreamOptions
{
    public Collection<string> Traces { get; } = [];

    public Collection<string> Metrics { get; } = [];

    public Collection<string> Logs { get; } = [];

    public IReadOnlyList<string> For(ObservabilitySignal signal)
    {
        ArgumentNullException.ThrowIfNull(signal);

        return signal.RouteGroup switch
        {
            ObservabilityPaths.TracesRouteGroup => Traces,
            ObservabilityPaths.MetricsRouteGroup => Metrics,
            _ => Logs,
        };
    }
}

internal sealed class AuthenticationOptions
{
    /// <summary>
    /// Path to the mounted <c>auth-tokens.json</c> Secret entry. Tokens are read from the file
    /// rather than from the manifest, so rotating one is not a Deployment change.
    /// </summary>
    public string TokensFilePath { get; set; } = string.Empty;

    /// <summary>How often the mounted token file is re-read. Rotation takes effect within this window.</summary>
    public int TokensFileReloadSeconds { get; set; } = 30;

    /// <summary>
    /// Tokens configured inline. Used for local runs and tests; production uses the mounted file.
    /// </summary>
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
    /// <summary>
    /// Permits per window for a source identity with no entry in <see cref="PermitLimits"/>. Sized
    /// for an identity that is one cluster.
    /// </summary>
    public int PermitLimit { get; set; } = 10000;

    /// <summary>
    /// Per-identity overrides, keyed by source identity. The shared runtime identities cover tens of
    /// clusters each, so one bucket sized for a single cluster would reject legitimate traffic.
    /// </summary>
    public Dictionary<string, int> PermitLimits { get; } = new(StringComparer.OrdinalIgnoreCase);

    public int WindowSeconds { get; set; } = 60;

    public int QueueLimit { get; set; }

    /// <summary>Permits per window for <paramref name="sourceIdentity"/>, or the default.</summary>
    public int PermitLimitFor(string sourceIdentity) =>
        PermitLimits.TryGetValue(sourceIdentity, out var permitLimit) ? permitLimit : PermitLimit;
}
