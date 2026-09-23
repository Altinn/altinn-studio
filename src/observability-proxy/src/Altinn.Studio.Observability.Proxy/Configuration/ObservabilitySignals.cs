namespace Altinn.Studio.Observability.Proxy.Configuration;

/// <summary>
/// The backend paths for each signal. These are protocol, not deployment configuration: they are
/// fixed by the Victoria components and by what Grafana's datasources append to their base URL.
/// </summary>
internal sealed record ObservabilitySignal(
    string RouteGroup,
    string PublicWritePath,
    string AgentWritePath,
    string StorageReadPath,
    IReadOnlyList<ReadEndpoint> ReadEndpoints
)
{
    /// <summary>
    /// vtagent accepts OTLP over HTTP; VictoriaTraces reads go to the Tempo-compatible API.
    ///
    /// The read endpoints are the Tempo HTTP API calls of Grafana's Tempo datasource: the health
    /// check, search, trace by ID, the v2 tag endpoints and TraceQL metrics. Everything under
    /// <c>/select/tempo</c> is read-only already; the list keeps the query token to those calls.
    /// </summary>
    public static readonly ObservabilitySignal Traces = new(
        ObservabilityPaths.TracesRouteGroup,
        "/v1/traces",
        "/insert/opentelemetry/v1/traces",
        "/select/tempo",
        [
            new("/api/echo"),
            new("/api/search"),
            new("/api/traces/*"),
            new("/api/v2/traces/*"),
            new("/api/v2/search/tags"),
            new("/api/v2/search/tag/*/values"),
            new("/api/metrics/query"),
            new("/api/metrics/query_range"),
        ]
    );

    /// <summary>
    /// vmagent's OTLP endpoint; VictoriaMetrics serves the Prometheus query API at its root.
    ///
    /// VictoriaMetrics serves writes, imports, deletion, snapshots, merges and profiling at that
    /// same root, so the query token reaches only the Prometheus read API that Grafana's
    /// Prometheus datasource calls. It POSTs a form body to the endpoints listed with POST when the
    /// datasource's HTTP method is POST, which is its default.
    /// </summary>
    public static readonly ObservabilitySignal Metrics = new(
        ObservabilityPaths.MetricsRouteGroup,
        "/v1/metrics",
        "/opentelemetry/v1/metrics",
        "",
        [
            new("/api/v1/query", allowsPost: true),
            new("/api/v1/query_range", allowsPost: true),
            new("/api/v1/series", allowsPost: true),
            new("/api/v1/labels", allowsPost: true),
            new("/api/v1/query_exemplars", allowsPost: true),
            new("/api/v1/label/*/values"),
            new("/api/v1/metadata"),
            new("/api/v1/rules"),
            new("/api/v1/status/buildinfo"),
        ]
    );

    /// <summary>
    /// vlagent's OTLP endpoint; VictoriaLogs serves its query API at its root.
    ///
    /// VictoriaLogs serves ingestion and its internal endpoints at that same root, so the query
    /// token reaches only the LogsQL query API and the tenant list, which is what the VictoriaLogs
    /// Grafana datasource calls. It sends both with its configured HTTP method, GET or POST.
    /// </summary>
    public static readonly ObservabilitySignal Logs = new(
        ObservabilityPaths.LogsRouteGroup,
        "/v1/logs",
        "/insert/opentelemetry/v1/logs",
        "",
        [new("/select/logsql/*", allowsPost: true), new("/select/tenant_ids", allowsPost: true)]
    );

    public static readonly IReadOnlyList<ObservabilitySignal> All = [Traces, Metrics, Logs];

    /// <summary>The signal whose read route group is <paramref name="routeGroup"/>, if any.</summary>
    public static ObservabilitySignal? ForReadRouteGroup(string routeGroup) =>
        All.FirstOrDefault(signal => string.Equals(signal.RouteGroup, routeGroup, StringComparison.Ordinal));

    /// <summary>Whether the query token may send <paramref name="method"/> to <paramref name="readPath"/>.</summary>
    public bool AllowsRead(string method, string readPath) => ReadEndpoint.Allows(ReadEndpoints, method, readPath);
}
