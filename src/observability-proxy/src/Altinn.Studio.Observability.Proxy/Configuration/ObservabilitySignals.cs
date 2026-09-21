namespace Altinn.Studio.Observability.Proxy.Configuration;

/// <summary>
/// The backend paths for each signal. These are protocol, not deployment configuration: they are
/// fixed by the Victoria components and by what Grafana's datasources append to their base URL.
/// </summary>
internal sealed record ObservabilitySignal(
    string RouteGroup,
    string PublicWritePath,
    string AgentWritePath,
    string StorageReadPath
)
{
    /// <summary>vtagent accepts OTLP over HTTP; VictoriaTraces reads go to the Tempo-compatible API.</summary>
    public static readonly ObservabilitySignal Traces = new(
        ObservabilityPaths.TracesRouteGroup,
        "/v1/traces",
        "/insert/opentelemetry/v1/traces",
        "/select/tempo"
    );

    /// <summary>vmagent's OTLP endpoint; VictoriaMetrics serves the Prometheus query API at its root.</summary>
    public static readonly ObservabilitySignal Metrics = new(
        ObservabilityPaths.MetricsRouteGroup,
        "/v1/metrics",
        "/opentelemetry/v1/metrics",
        ""
    );

    /// <summary>vlagent's OTLP endpoint; VictoriaLogs serves its query API at its root.</summary>
    public static readonly ObservabilitySignal Logs = new(
        ObservabilityPaths.LogsRouteGroup,
        "/v1/logs",
        "/insert/opentelemetry/v1/logs",
        ""
    );

    public static readonly IReadOnlyList<ObservabilitySignal> All = [Traces, Metrics, Logs];
}
