namespace Altinn.Studio.Observability.Proxy.Configuration;

/// <summary>
/// The backend paths for each signal. These are protocol, not deployment configuration: they are
/// fixed by the Victoria components and by what Grafana's datasources append to their base URL.
/// </summary>
/// <param name="Name">The signal, which names its agent and storage clusters.</param>
/// <param name="PublicWritePath">The OTLP path below <c>/otlp</c>.</param>
/// <param name="AgentWritePath">Where the signal's agent accepts OTLP.</param>
/// <param name="ReadApis">The query APIs of the signal's storage, each with its own route group.</param>
internal sealed record ObservabilitySignal(
    string Name,
    string PublicWritePath,
    string AgentWritePath,
    IReadOnlyList<ReadApi> ReadApis
)
{
    /// <summary>
    /// The LogsQL query API and the tenant list, which is what the VictoriaLogs Grafana datasource
    /// calls. It sends both with its configured HTTP method, GET or POST. Everything VictoriaLogs and
    /// VictoriaTraces serve below <c>/select/logsql</c> is a query.
    /// </summary>
    private static readonly IReadOnlyList<ReadEndpoint> LogsqlEndpoints =
    [
        new("/select/logsql/*", allowsPost: true),
        new("/select/tenant_ids", allowsPost: true),
    ];

    private static readonly IReadOnlyDictionary<string, string> NoHeaders = new Dictionary<string, string>();

    /// <summary>
    /// Headers the proxy sets on every write to the signal's agent, after dropping the ones the
    /// source sent. They shape what is stored, so they belong to the protocol, not to a source.
    /// </summary>
    public IReadOnlyDictionary<string, string> AgentWriteHeaders { get; init; } = NoHeaders;

    /// <summary>
    /// vtagent accepts OTLP over HTTP; VictoriaTraces serves two query APIs.
    ///
    /// <c>traces</c> is the Tempo-compatible API, for Grafana's Tempo datasource. Its read endpoints
    /// are the datasource's calls: the health check, search, trace by ID, the v2 tag endpoints and
    /// TraceQL metrics. Everything under <c>/select/tempo</c> is read-only already; the list keeps the
    /// query token to those calls.
    ///
    /// <c>traces-logsql</c> is the LogsQL API over the same spans, one row of fields per span, for the
    /// VictoriaLogs datasource. It answers what TraceQL cannot, such as a table of spans with any
    /// attributes as columns, or <c>stats by</c> a high-cardinality attribute. VictoriaTraces serves
    /// it at its root, beside ingestion and its internal endpoints, so the list is the same as for
    /// logs.
    /// </summary>
    public static readonly ObservabilitySignal Traces = new(
        "traces",
        "/v1/traces",
        "/insert/opentelemetry/v1/traces",
        [
            new(
                ObservabilityPaths.TracesRouteGroup,
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
            ),
            new(ObservabilityPaths.TracesLogsqlRouteGroup, "", LogsqlEndpoints),
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
        "metrics",
        "/v1/metrics",
        "/opentelemetry/v1/metrics",
        [
            new(
                ObservabilityPaths.MetricsRouteGroup,
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
            ),
        ]
    );

    /// <summary>
    /// vlagent's OTLP endpoint; VictoriaLogs serves its query API at its root.
    ///
    /// VictoriaLogs serves ingestion and its internal endpoints at that same root, so the query
    /// token reaches only the LogsQL query API and the tenant list.
    ///
    /// Without <c>VL-Stream-Fields</c>, VictoriaLogs makes every resource attribute of an OTLP log a
    /// stream field. The set here is the one VictoriaLogs recommends instead: the fields that
    /// identify the instance that wrote the log, plus ones that stay constant for its lifetime.
    /// </summary>
    public static readonly ObservabilitySignal Logs = new(
        "logs",
        "/v1/logs",
        "/insert/opentelemetry/v1/logs",
        [new(ObservabilityPaths.LogsRouteGroup, "", LogsqlEndpoints)]
    )
    {
        AgentWriteHeaders = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["VL-Stream-Fields"] = "k8s.cluster.name,k8s.namespace.name,service.name,k8s.pod.name",
        },
    };

    public static readonly IReadOnlyList<ObservabilitySignal> All = [Traces, Metrics, Logs];

    /// <summary>Every read route group, which is what a query token is granted.</summary>
    public static readonly IReadOnlyList<string> ReadRouteGroups =
    [
        .. All.SelectMany(signal => signal.ReadApis).Select(readApi => readApi.RouteGroup),
    ];

    /// <summary>The signal named <paramref name="name"/>, if any.</summary>
    public static ObservabilitySignal? Named(string name) =>
        All.FirstOrDefault(signal => string.Equals(signal.Name, name, StringComparison.Ordinal));

    /// <summary>The read API whose route group is <paramref name="routeGroup"/>, if any.</summary>
    public static ReadApi? ReadApiFor(string routeGroup) =>
        All.SelectMany(signal => signal.ReadApis)
            .FirstOrDefault(readApi => string.Equals(readApi.RouteGroup, routeGroup, StringComparison.Ordinal));
}
