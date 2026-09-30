namespace Altinn.Studio.Observability.Proxy.Tests.Auth;

/// <summary>
/// Authorization comes from the route a request matched, so no spelling of a path can reach a
/// backend under a route group other than the one the route names, or reach one without a token.
/// Every request line here is sent as written: HttpClient would normalize most of them first.
/// </summary>
public sealed class RouteAuthorizationTests
{
    private const string Query = ProxyConfiguration.QueryToken;
    private const string Ingest = ProxyConfiguration.IngestToken;

    public static TheoryData<string, string, string?, int> RefusedVariants =>
        new()
        {
            // Doubled slashes match no route, so nothing under them is forwarded.
            { "POST", "//internal/observability/otlp/v1/traces", Ingest, 404 },
            { "POST", "//internal/observability/otlp/v1/traces", null, 404 },
            { "POST", "/internal//observability/otlp/v1/traces", Ingest, 404 },
            { "POST", "/internal/observability//otlp/v1/traces", Ingest, 404 },
            { "GET", "/internal/observability//metrics/api/v1/query", Query, 404 },
            { "GET", "/internal/observability/metrics//api/v1/query", Query, 404 },
            { "GET", "/internal/observability/metrics/api//v1/query", Query, 404 },
            // Case: routing ignores it, the route group still applies, the backend path does not.
            { "GET", "/INTERNAL/OBSERVABILITY/METRICS/api/v1/query", Ingest, 403 },
            { "GET", "/INTERNAL/OBSERVABILITY/METRICS/api/v1/query", null, 401 },
            { "POST", "/Internal/Observability/Metrics/api/v1/write", Query, 404 },
            { "GET", "/internal/observability/metrics/API/V1/QUERY", Query, 404 },
            { "POST", "/INTERNAL/OBSERVABILITY/OTLP/V1/TRACES", Query, 403 },
            // Escaped slashes are not separators to Kestrel, but they are to the Go backends.
            { "GET", "/internal/observability/metrics%2Fapi%2Fv1%2Fquery", Query, 404 },
            { "GET", "/internal/observability%2Fmetrics/api/v1/query", Query, 404 },
            { "POST", "/internal/observability/metrics/api%2Fv1%2Fadmin%2Ftsdb%2Fdelete_series", Query, 404 },
            {
                "POST",
                "/internal/observability/metrics/api/v1/label/..%2F..%2Fadmin%2Ftsdb%2Fdelete_series/values",
                Query,
                404
            },
            { "POST", "/internal/observability/logs/select/logsql/..%2F..%2Finsert%2Fjsonline", Query, 404 },
            { "POST", "/internal/observability/logs/select/logsql/%2e%2e%2F%2e%2e%2Finsert%2Fjsonline", Query, 404 },
            { "POST", "/internal/observability/otlp/v1%2Ftraces", Ingest, 404 },
            // Dot segments, plain or escaped, resolve before routing and land on another route.
            { "POST", "/internal/observability/logs/select/logsql/%2e%2e/%2e%2e/insert/jsonline", Query, 404 },
            { "POST", "/internal/observability/logs/select/logsql/../../insert/jsonline", Query, 404 },
            { "POST", "/internal/observability/metrics/../otlp/v1/metrics", Query, 403 },
            { "POST", "/internal/observability/metrics/%2e%2e/otlp/v1/metrics", Query, 403 },
            { "POST", "/internal/observability/otlp/v1/../../metrics/api/v1/write", Query, 404 },
            { "POST", "/internal/observability/otlp/../metrics/api/v1/query", Ingest, 403 },
            // Trailing slashes and bare prefixes.
            { "GET", "/internal/observability/metrics/api/v1/query/", Query, 404 },
            { "GET", "/internal/observability/metrics", Query, 404 },
            { "GET", "/internal/observability/", Query, 404 },
            { "GET", "/internal/observability", Query, 404 },
            { "GET", "/internal/observability", null, 401 },
            // Under the prefix but no route: authenticated first, then nothing.
            { "GET", "/internal/observability/unknown/api/v1/query", Query, 404 },
            { "GET", "/internal/observability/unknown/api/v1/query", null, 401 },
            { "GET", "/internal/observability/otlp/v1/traces", Ingest, 404 },
            { "POST", "/internal/observability/otlp/v1/profiles", Ingest, 404 },
        };

    [Theory]
    [MemberData(nameof(RefusedVariants))]
    public async Task PathVariant_IsRefusedWithoutContactingTheBackend(
        string method,
        string rawTarget,
        string? token,
        int expectedStatus
    )
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        var status = await proxy.SendRawAsync(method, rawTarget, token);

        Assert.Equal(expectedStatus, status);
        Assert.Empty(downstream.ReceivedPaths);
    }

    [Theory]
    [InlineData("GET", "/INTERNAL/OBSERVABILITY/METRICS/api/v1/query", Query, "/api/v1/query")]
    [InlineData("POST", "/internal/observability/otlp/v1/traces/", Ingest, "/insert/opentelemetry/v1/traces")]
    [InlineData("POST", "/internal/observability/OTLP/v1/Logs", Ingest, "/insert/opentelemetry/v1/logs")]
    [InlineData("GET", "/internal/observability/logs/select/logsql/../logsql/query", Query, "/select/logsql/query")]
    public async Task HarmlessVariant_ReachesTheBackendPathOfItsRoute(
        string method,
        string rawTarget,
        string token,
        string backendPath
    )
    {
        // Routing is case-insensitive and ignores one trailing slash, and dot segments are
        // resolved before routing. Each of these lands on one route, with that route's group and
        // backend path, so it reaches only what its canonical spelling reaches.
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        var status = await proxy.SendRawAsync(method, rawTarget, token);

        Assert.Equal(200, status);
        Assert.Equal(backendPath, Assert.Single(downstream.ReceivedPaths));
    }
}
