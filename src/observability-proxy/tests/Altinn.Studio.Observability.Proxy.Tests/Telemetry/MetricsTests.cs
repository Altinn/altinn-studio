using System.Globalization;
using System.Net;

namespace Altinn.Studio.Observability.Proxy.Tests.Telemetry;

/// <summary>
/// The metrics as the scraper reads them: Prometheus names and labels, from the proxy's metrics
/// port. These are what the dashboards and alert rules query.
/// </summary>
public sealed class MetricsTests : IDisposable
{
    private const string Requests = "http_server_request_duration_seconds_count";
    private const string AuthenticationFailures = "altinn_observability_proxy_authentication_failures_total";
    private const string RateLimitRejections = "altinn_observability_proxy_rate_limit_rejections_total";
    private const string ForwardingErrors = "altinn_observability_proxy_forwarding_errors_total";
    private const string Failovers = "altinn_observability_proxy_read_failovers_total";
    private const string ActiveDestination = "altinn_observability_proxy_read_destination_active";
    private const string HealthyDestination = "altinn_observability_proxy_read_destination_healthy";

    private const string SourceIdentity = "altinn_observability_proxy_source_identity";
    private const string TokenSlot = "altinn_observability_proxy_token_slot";
    private const string Signal = "altinn_observability_proxy_signal";
    private const string Direction = "altinn_observability_proxy_direction";
    private const string Destination = "altinn_observability_proxy_destination";
    private const string Status = "http_response_status_code";

    /// <summary>
    /// Nothing listens on port 1, so a connection there is refused. A port picked free and released
    /// would not do: another test running alongside can bind it in between.
    /// </summary>
    private const string RefusingAddress = "http://127.0.0.1:1";

    private const string CurrentToken = "current-secret-0123456789abcdef0123";
    private const string PreviousToken = "previous-secret-0123456789abcdef012";

    private readonly string _tokensPath = Path.Combine(Path.GetTempPath(), $"auth-tokens-{Guid.NewGuid():N}.json");

    [Fact]
    public async Task Requests_AreCountedPerSourceIdentitySignalDirectionAndStatus()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "/otlp/v1/logs", ProxyConfiguration.IngestToken));
        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "/otlp/v1/logs", ProxyConfiguration.IngestToken));
        Assert.Equal(HttpStatusCode.OK, await GetAsync(proxy, "/traces/api/search", ProxyConfiguration.QueryToken));
        // A token used on a path it was not granted is the source's request, refused.
        Assert.Equal(
            HttpStatusCode.Forbidden,
            await GetAsync(proxy, "/metrics/api/v1/query", ProxyConfiguration.IngestToken)
        );

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(Requests) >= 4);

        Assert.Equal(
            2,
            metrics.Sum(
                Requests,
                (SourceIdentity, "runtime-prod"),
                (TokenSlot, "current"),
                (Signal, "logs"),
                (Direction, "ingest"),
                (Status, "200")
            )
        );
        Assert.Equal(
            1,
            metrics.Sum(
                Requests,
                (SourceIdentity, "grafana"),
                (Signal, "traces"),
                (Direction, "query"),
                (Status, "200")
            )
        );
        Assert.Equal(
            1,
            metrics.Sum(
                Requests,
                (SourceIdentity, "runtime-prod"),
                (Signal, "metrics"),
                (Direction, "query"),
                (Status, "403")
            )
        );
    }

    [Fact]
    public async Task ForwardedRequests_AreMeasuredPerBackend_WithoutTheTimeInTheConnectionQueue()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "/otlp/v1/logs", ProxyConfiguration.IngestToken));

        // Only the forwarder's requests: not this test's own request to the proxy, which is to the
        // same address on another port.
        var backend = new Uri(downstream.Address);
        (string, string)[] forwardedWrite =
        [
            ("http_request_method", "POST"),
            ("server_address", backend.Host),
            ("server_port", backend.Port.ToString(CultureInfo.InvariantCulture)),
        ];
        var metrics = await proxy.ScrapeUntilAsync(scraped =>
            scraped.Sum("http_client_request_duration_seconds_count", forwardedWrite) >= 1
        );

        Assert.Equal(
            1,
            metrics.Sum(
                "http_client_request_duration_seconds_count",
                [.. forwardedWrite, ("http_response_status_code", "200")]
            )
        );
        Assert.Empty(metrics.Series("http_client_request_time_in_queue_seconds_count"));
    }

    [Fact]
    public async Task UnauthenticatedRequests_AreCountedByReason_WithoutAnIdentityOrTheToken()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );
        const string unknownToken = "unknown-secret-0123456789abcdef0123";

        Assert.Equal(HttpStatusCode.Unauthorized, await PostAsync(proxy, "/otlp/v1/metrics", token: null));
        using var basic = new HttpRequestMessage(HttpMethod.Post, "/internal/observability/otlp/v1/metrics");
        basic.Headers.Authorization = new("Basic", "dXNlcjpwYXNzd29yZA==");
        using var basicResponse = await proxy.Client.SendAsync(basic, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, basicResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, await PostAsync(proxy, "/otlp/v1/metrics", unknownToken));
        Assert.Equal(HttpStatusCode.Unauthorized, await GetAsync(proxy, "/logs/select/logsql/query", unknownToken));

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(Requests, (Status, "401")) >= 4);

        // No Authorization header and another scheme alike: no bearer token.
        Assert.Equal(
            2,
            metrics.Sum(
                AuthenticationFailures,
                ("error_type", "missing_bearer_token"),
                (Signal, "metrics"),
                (Direction, "ingest")
            )
        );
        Assert.Equal(
            1,
            metrics.Sum(
                AuthenticationFailures,
                ("error_type", "unknown_token"),
                (Signal, "metrics"),
                (Direction, "ingest")
            )
        );
        Assert.Equal(
            1,
            metrics.Sum(AuthenticationFailures, ("error_type", "unknown_token"), (Signal, "logs"), (Direction, "query"))
        );
        Assert.Equal(3, metrics.Sum(Requests, (Signal, "metrics"), (Direction, "ingest"), (Status, "401")));
        Assert.All(
            metrics.Series(Requests, (Status, "401")),
            series => Assert.DoesNotContain(SourceIdentity, series.Labels.Keys)
        );
        Assert.DoesNotContain(unknownToken, metrics.Text, StringComparison.Ordinal);
    }

    [Fact]
    public async Task TokenSlot_SaysWhichOfAnIdentitysTokensWasUsed_WithoutTheToken()
    {
        // The rotation's last step waits until no source presents the previous slot any more.
        await File.WriteAllTextAsync(
            _tokensPath,
            $$"""{ "ingest": { "studio-prod": ["{{CurrentToken}}", "{{PreviousToken}}"] } }""",
            TestContext.Current.CancellationToken
        );
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Downstreams:Agents:Traces"] = downstream.Address,
                ["ObservabilityProxy:Authentication:TokensFilePath"] = _tokensPath,
            }
        );

        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "/otlp/v1/traces", CurrentToken));
        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "/otlp/v1/traces", PreviousToken));
        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "/otlp/v1/traces", PreviousToken));

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(Requests, (Status, "200")) >= 3);

        Assert.Equal(1, metrics.Sum(Requests, (SourceIdentity, "studio-prod"), (TokenSlot, "current")));
        Assert.Equal(2, metrics.Sum(Requests, (SourceIdentity, "studio-prod"), (TokenSlot, "previous")));
        Assert.DoesNotContain(CurrentToken, metrics.Text, StringComparison.Ordinal);
        Assert.DoesNotContain(PreviousToken, metrics.Text, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RateLimitRejections_AreCountedPerIdentity()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        var configuration = ProxyConfiguration.WithBothTokens(downstream.Address);
        configuration["ObservabilityProxy:RateLimiting:PermitLimit"] = "1";
        await using var proxy = await TestWebApplication.StartProxyAsync(configuration);

        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "/otlp/v1/traces", ProxyConfiguration.IngestToken));
        Assert.Equal(
            HttpStatusCode.TooManyRequests,
            await PostAsync(proxy, "/otlp/v1/traces", ProxyConfiguration.IngestToken)
        );
        Assert.Equal(
            HttpStatusCode.TooManyRequests,
            await PostAsync(proxy, "/otlp/v1/metrics", ProxyConfiguration.IngestToken)
        );
        // Another identity has a window of its own.
        Assert.Equal(HttpStatusCode.OK, await GetAsync(proxy, "/metrics/api/v1/query", ProxyConfiguration.QueryToken));

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(Requests) >= 4);

        Assert.Equal(2, metrics.Sum(RateLimitRejections, (SourceIdentity, "runtime-prod"), (Direction, "ingest")));
        Assert.Equal(1, metrics.Sum(RateLimitRejections, (SourceIdentity, "runtime-prod"), (Signal, "traces")));
        Assert.Equal(0, metrics.Sum(RateLimitRejections, (SourceIdentity, "grafana")));
        Assert.Equal(2, metrics.Sum(Requests, (SourceIdentity, "runtime-prod"), (Status, "429")));
    }

    [Fact]
    public async Task ForwardingErrors_AreCountedPerDestination()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        var configuration = ProxyConfiguration.WithBothTokens(downstream.Address);
        configuration["ObservabilityProxy:Downstreams:Agents:Metrics"] = RefusingAddress;
        await using var proxy = await TestWebApplication.StartProxyAsync(configuration);

        Assert.Equal(
            HttpStatusCode.BadGateway,
            await PostAsync(proxy, "/otlp/v1/metrics", ProxyConfiguration.IngestToken)
        );

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(ForwardingErrors) >= 1);

        Assert.Equal(
            1,
            metrics.Sum(
                ForwardingErrors,
                (Destination, "agent"),
                (Signal, "metrics"),
                (Direction, "ingest"),
                ("error_type", "request")
            )
        );
    }

    [Fact]
    public async Task ClientCancellations_AreNotCountedAsForwardingErrors()
    {
        // Grafana cancels queries it no longer needs; that says nothing about the backend.
        await using var slow = await TestWebApplication.StartDownstreamAsync(async context =>
        {
            if (context.Request.Path == "/health")
            {
                return;
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), context.RequestAborted);
            }
            catch (OperationCanceledException)
            {
                // The proxy gave up on the request when its client did.
            }
        });
        var configuration = ProxyConfiguration.WithBothTokens(slow.Address);
        configuration["ObservabilityProxy:Downstreams:Agents:Metrics"] = RefusingAddress;
        await using var proxy = await TestWebApplication.StartProxyAsync(configuration);

        using (var cancel = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken))
        {
            cancel.CancelAfter(TimeSpan.FromMilliseconds(500));
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                "/internal/observability/metrics/api/v1/query?query=up"
            );
            request.Headers.Authorization = new("Bearer", ProxyConfiguration.QueryToken);
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
                proxy.Client.SendAsync(request, cancel.Token)
            );
        }

        // A backend that refuses the connection is, for comparison.
        Assert.Equal(
            HttpStatusCode.BadGateway,
            await PostAsync(proxy, "/otlp/v1/metrics", ProxyConfiguration.IngestToken)
        );

        var metrics = await proxy.ScrapeUntilAsync(scraped =>
            scraped.Sum(Requests, (SourceIdentity, "grafana")) >= 1 && scraped.Sum(ForwardingErrors) >= 1
        );

        Assert.Equal(1, metrics.Sum(Requests, (SourceIdentity, "grafana"), (Status, "499")));
        Assert.Equal(0, metrics.Sum(ForwardingErrors, (Direction, "query")));
        Assert.Equal(1, metrics.Sum(ForwardingErrors, (Destination, "agent"), ("error_type", "request")));
    }

    [Fact]
    public async Task EverySeries_NamesThePod()
    {
        // The Deployment sets service.instance.id to the pod's name through OTEL_RESOURCE_ATTRIBUTES.
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        var configuration = ProxyConfiguration.WithBothTokens(downstream.Address);
        configuration["OTEL_RESOURCE_ATTRIBUTES"] = "service.instance.id=observability-proxy-5d9f-x2x4z";
        await using var proxy = await TestWebApplication.StartProxyAsync(configuration);

        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "/otlp/v1/logs", ProxyConfiguration.IngestToken));
        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(Requests) >= 1);

        Assert.Single(metrics.Series("target_info", ("service_instance_id", "observability-proxy-5d9f-x2x4z")));
        Assert.All(
            metrics.Series(Requests),
            series => Assert.Equal("observability-proxy-5d9f-x2x4z", series.Labels["service_instance_id"])
        );
    }

    [Fact]
    public async Task Failover_MovesTheActiveDestination_AndIsCounted()
    {
        var firstHealthy = true;
        await using var first = await TestWebApplication.StartNamedDownstreamAsync(
            "a",
            () => Volatile.Read(ref firstHealthy)
        );
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        var configuration = ProxyConfiguration.WithBothTokens(first.Address);
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:0"] = first.Address;
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:1"] = second.Address;
        configuration["ObservabilityProxy:Downstreams:Storage:HealthCheckIntervalSeconds"] = "1";
        await using var proxy = await TestWebApplication.StartProxyAsync(configuration);

        Assert.Equal("a", await ReadMetricsAsync(proxy));
        var before = await proxy.ScrapeAsync();
        Assert.Equal(1, before.Sum(ActiveDestination, (Signal, "metrics"), (Destination, "a")));
        Assert.Equal(0, before.Sum(ActiveDestination, (Signal, "metrics"), (Destination, "b")));
        Assert.Equal(0, before.Sum(Failovers));

        // The gauges follow the health checks before any read moves.
        Volatile.Write(ref firstHealthy, false);
        var standby = await proxy.ScrapeUntilAsync(scraped =>
            scraped.Sum(ActiveDestination, (Signal, "metrics"), (Destination, "b")) >= 1
        );
        Assert.Equal(0, standby.Sum(HealthyDestination, (Signal, "metrics"), (Destination, "a")));
        Assert.Equal(0, standby.Sum(ActiveDestination, (Signal, "metrics"), (Destination, "a")));
        Assert.Equal(0, standby.Sum(Failovers));

        Assert.Equal("b", await ReadMetricsAsync(proxy));
        var movedOnce = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(Failovers) >= 1);
        Assert.Equal(1, movedOnce.Sum(Failovers, (Signal, "metrics"), (Destination, "b")));

        // Ready to fail back: the first copy is healthy again, and reads stay on the second.
        Volatile.Write(ref firstHealthy, true);
        var recovered = await proxy.ScrapeUntilAsync(scraped =>
            scraped.Sum(HealthyDestination, (Signal, "metrics"), (Destination, "a")) >= 1
        );
        Assert.Equal(1, recovered.Sum(ActiveDestination, (Signal, "metrics"), (Destination, "b")));
        Assert.Equal("b", await ReadMetricsAsync(proxy));
        Assert.Equal(1, (await proxy.ScrapeAsync()).Sum(Failovers));

        // The other signals never moved.
        Assert.Equal(1, recovered.Sum(ActiveDestination, (Signal, "logs"), (Destination, "a")));
    }

    [Fact]
    public async Task MetricsPort_ServesOnlyMetrics_AndProbesAndScrapesAreNotCountedAsRequests()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );
        var metricsClient = proxy.MetricsClient;
        Assert.NotNull(metricsClient);

        // Nothing but /metrics on the metrics port: no proxy route, and no health endpoint.
        using var write = new HttpRequestMessage(HttpMethod.Post, "/internal/observability/otlp/v1/logs");
        write.Headers.Authorization = new("Bearer", ProxyConfiguration.IngestToken);
        using var writeResponse = await metricsClient.SendAsync(write, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, writeResponse.StatusCode);
        Assert.Empty(downstream.ReceivedPaths);
        using var health = await metricsClient.GetAsync(
            new Uri("/health/live", UriKind.Relative),
            TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.NotFound, health.StatusCode);

        // And no metrics on the traffic port, which the load balancer reaches.
        using var metricsOnTraffic = await proxy.Client.GetAsync(
            new Uri("/metrics", UriKind.Relative),
            TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.NotFound, metricsOnTraffic.StatusCode);

        foreach (var probe in new[] { "/health/live", "/health/ready" })
        {
            using var response = await proxy.Client.GetAsync(
                new Uri(probe, UriKind.Relative),
                TestContext.Current.CancellationToken
            );
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        await proxy.ScrapeAsync();
        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(Requests) >= 1);

        // Only the request for /metrics on the traffic port: nothing on the metrics port, and no
        // probe.
        Assert.Equal(1, metrics.Sum(Requests));
        Assert.Equal(1, metrics.Sum(Requests, (Status, "404")));
        Assert.Empty(metrics.Series(Requests, ("http_route", "/health/live")));
        Assert.Empty(metrics.Series(Requests, ("http_route", "/health/ready")));
    }

    public void Dispose()
    {
        File.Delete(_tokensPath);
    }

    private static async Task<string> ReadMetricsAsync(TestWebApplication proxy)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "/internal/observability/metrics/api/v1/query?query=up"
        );
        request.Headers.Authorization = new("Bearer", ProxyConfiguration.QueryToken);
        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);
        return await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
    }

    private static Task<HttpStatusCode> PostAsync(TestWebApplication proxy, string path, string? token) =>
        SendAsync(proxy, HttpMethod.Post, path, token);

    private static Task<HttpStatusCode> GetAsync(TestWebApplication proxy, string path, string? token) =>
        SendAsync(proxy, HttpMethod.Get, path, token);

    private static async Task<HttpStatusCode> SendAsync(
        TestWebApplication proxy,
        HttpMethod method,
        string path,
        string? token
    )
    {
        using var request = new HttpRequestMessage(method, $"/internal/observability{path}");
        if (token is not null)
        {
            request.Headers.Authorization = new("Bearer", token);
        }

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);
        return response.StatusCode;
    }
}
