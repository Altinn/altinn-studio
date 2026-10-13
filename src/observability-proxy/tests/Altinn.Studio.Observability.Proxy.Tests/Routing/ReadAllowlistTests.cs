using System.Net;
using System.Text;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

/// <summary>
/// The query token reaches the read APIs the Grafana datasources call and nothing else, although
/// VictoriaMetrics, VictoriaLogs and VictoriaTraces serve writes, deletion and admin endpoints at
/// the same root.
/// </summary>
public sealed class ReadAllowlistTests
{
    public static TheoryData<string, string, string> AllowedReads =>
        new()
        {
            // Grafana's Prometheus datasource.
            { "GET", "/metrics/api/v1/query?query=vector(1)", "/api/v1/query?query=vector(1)" },
            { "POST", "/metrics/api/v1/query", "/api/v1/query" },
            { "POST", "/metrics/api/v1/query_range", "/api/v1/query_range" },
            { "GET", "/metrics/api/v1/series?match[]=up", "/api/v1/series?match[]=up" },
            { "POST", "/metrics/api/v1/series", "/api/v1/series" },
            { "POST", "/metrics/api/v1/labels", "/api/v1/labels" },
            { "GET", "/metrics/api/v1/label/job/values", "/api/v1/label/job/values" },
            { "GET", "/metrics/api/v1/label/__name__/values", "/api/v1/label/__name__/values" },
            { "GET", "/metrics/api/v1/metadata", "/api/v1/metadata" },
            { "POST", "/metrics/api/v1/query_exemplars", "/api/v1/query_exemplars" },
            { "GET", "/metrics/api/v1/rules", "/api/v1/rules" },
            { "GET", "/metrics/api/v1/status/buildinfo", "/api/v1/status/buildinfo" },
            // The VictoriaLogs datasource.
            { "GET", "/logs/select/logsql/query?query=*", "/select/logsql/query?query=*" },
            { "POST", "/logs/select/logsql/query", "/select/logsql/query" },
            { "POST", "/logs/select/logsql/stats_query_range", "/select/logsql/stats_query_range" },
            { "POST", "/logs/select/logsql/field_names", "/select/logsql/field_names" },
            { "GET", "/logs/select/logsql/hits", "/select/logsql/hits" },
            { "POST", "/logs/select/tenant_ids", "/select/tenant_ids" },
            // Grafana's Tempo datasource, below the Tempo API path the route puts in front.
            { "GET", "/traces/api/echo", "/select/tempo/api/echo" },
            { "GET", "/traces/api/search?q=%7B%7D", "/select/tempo/api/search?q=%7B%7D" },
            {
                "GET",
                "/traces/api/traces/0af7651916cd43dd8448eb211c80319c",
                "/select/tempo/api/traces/0af7651916cd43dd8448eb211c80319c"
            },
            {
                "GET",
                "/traces/api/v2/traces/0af7651916cd43dd8448eb211c80319c",
                "/select/tempo/api/v2/traces/0af7651916cd43dd8448eb211c80319c"
            },
            { "GET", "/traces/api/v2/search/tags", "/select/tempo/api/v2/search/tags" },
            {
                "GET",
                "/traces/api/v2/search/tag/resource.service.name/values",
                "/select/tempo/api/v2/search/tag/resource.service.name/values"
            },
            { "GET", "/traces/api/metrics/query_range", "/select/tempo/api/metrics/query_range" },
            // The VictoriaLogs datasource on VictoriaTraces' LogsQL API, at the backend's root.
            { "GET", "/traces-logsql/select/logsql/query?query=*", "/select/logsql/query?query=*" },
            { "POST", "/traces-logsql/select/logsql/query", "/select/logsql/query" },
            { "POST", "/traces-logsql/select/logsql/stats_query", "/select/logsql/stats_query" },
            { "POST", "/traces-logsql/select/logsql/stats_query_range", "/select/logsql/stats_query_range" },
            { "POST", "/traces-logsql/select/logsql/field_names", "/select/logsql/field_names" },
            { "POST", "/traces-logsql/select/logsql/field_values", "/select/logsql/field_values" },
            { "POST", "/traces-logsql/select/logsql/stream_field_names", "/select/logsql/stream_field_names" },
            { "GET", "/traces-logsql/select/logsql/hits", "/select/logsql/hits" },
            { "POST", "/traces-logsql/select/tenant_ids", "/select/tenant_ids" },
        };

    /// <summary>Everything a query token must not reach, whatever the method.</summary>
    public static TheoryData<string, string> RefusedReads =>
        new()
        {
            // VictoriaMetrics: writes, imports, deletion, snapshots, merges, profiling, raw export.
            { "POST", "/metrics/api/v1/admin/tsdb/delete_series?match[]=up" },
            { "GET", "/metrics/api/v1/admin/tsdb/delete_series?match[]=up" },
            { "POST", "/metrics/api/v1/write" },
            { "POST", "/metrics/api/v1/import" },
            { "POST", "/metrics/api/v1/import/prometheus" },
            { "POST", "/metrics/api/v1/import/native" },
            { "POST", "/metrics/opentelemetry/v1/metrics" },
            { "POST", "/metrics/prometheus/api/v1/write" },
            { "GET", "/metrics/snapshot/create" },
            { "GET", "/metrics/snapshot/delete_all" },
            { "GET", "/metrics/internal/force_merge" },
            { "GET", "/metrics/internal/resetRollupResultCache" },
            { "GET", "/metrics/debug/pprof/" },
            { "GET", "/metrics/debug/pprof/heap" },
            { "GET", "/metrics/api/v1/export?match[]=up" },
            { "GET", "/metrics/federate" },
            { "GET", "/metrics/metrics" },
            { "GET", "/metrics/prometheus/api/v1/query" },
            // An allowed path with a method Grafana never uses on it.
            { "DELETE", "/metrics/api/v1/series" },
            { "PUT", "/metrics/api/v1/query" },
            { "POST", "/metrics/api/v1/label/job/values" },
            { "POST", "/metrics/api/v1/status/buildinfo" },
            // VictoriaLogs: ingestion and its internal endpoints.
            { "POST", "/logs/insert/jsonline" },
            { "POST", "/logs/insert/opentelemetry/v1/logs" },
            { "POST", "/logs/insert/elasticsearch/_bulk" },
            { "GET", "/logs/internal/force_merge" },
            { "GET", "/logs/internal/force_flush" },
            { "GET", "/logs/internal/partition/attach?name=x" },
            { "GET", "/logs/debug/pprof/" },
            { "GET", "/logs/select/vmui/" },
            { "DELETE", "/logs/select/logsql/query" },
            // VictoriaTraces: anything but the Tempo calls, even below /select/tempo.
            { "GET", "/traces/api/status/buildinfo" },
            { "POST", "/traces/api/search" },
            { "GET", "/traces/api/traces" },
            // VictoriaTraces' root, below the LogsQL prefix: ingestion, internal endpoints and the
            // other query APIs, which have their own prefix or none.
            { "POST", "/traces-logsql/insert/opentelemetry/v1/traces" },
            { "GET", "/traces-logsql/internal/force_merge" },
            { "GET", "/traces-logsql/internal/force_flush" },
            { "GET", "/traces-logsql/debug/pprof/" },
            { "GET", "/traces-logsql/metrics" },
            { "GET", "/traces-logsql/select/vmui/" },
            { "GET", "/traces-logsql/select/tempo/api/search" },
            { "GET", "/traces-logsql/select/jaeger/api/services" },
            { "GET", "/traces-logsql/api/search" },
            { "DELETE", "/traces-logsql/select/logsql/query" },
            // The bare prefixes.
            { "GET", "/metrics" },
            { "GET", "/metrics/" },
            { "GET", "/logs/" },
            { "GET", "/traces/" },
            { "GET", "/traces-logsql/" },
        };

    [Theory]
    [MemberData(nameof(AllowedReads))]
    public async Task QueryToken_ReachesTheReadApi(string method, string publicPath, string backendPath)
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        using var response = await SendAsync(proxy, method, publicPath, ProxyConfiguration.QueryToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(method, response.Headers.GetValues("X-Observed-Method").Single());
        Assert.Equal(backendPath, response.Headers.GetValues("X-Observed-Path").Single());
    }

    [Theory]
    [MemberData(nameof(RefusedReads))]
    public async Task QueryToken_IsRefusedWithoutContactingTheBackend(string method, string publicPath)
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        using var response = await SendAsync(proxy, method, publicPath, ProxyConfiguration.QueryToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(downstream.ReceivedPaths);
    }

    [Theory]
    [MemberData(nameof(RefusedReads))]
    public async Task IngestToken_IsForbiddenEveryReadPath(string method, string publicPath)
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        using var response = await SendAsync(proxy, method, publicPath, ProxyConfiguration.IngestToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(downstream.ReceivedPaths);
    }

    [Theory]
    [MemberData(nameof(AllowedReads))]
    public async Task IngestToken_IsForbiddenEvenTheAllowedReads(string method, string publicPath, string backendPath)
    {
        _ = backendPath;
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        using var response = await SendAsync(proxy, method, publicPath, ProxyConfiguration.IngestToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(downstream.ReceivedPaths);
    }

    private static async Task<HttpResponseMessage> SendAsync(
        TestWebApplication proxy,
        string method,
        string publicPath,
        string token
    )
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), "/internal/observability" + publicPath);
        request.Headers.Authorization = new("Bearer", token);
        if (method is "POST" or "PUT")
        {
            request.Content = new StringContent("query=up", Encoding.UTF8, "application/x-www-form-urlencoded");
        }

        return await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);
    }
}
