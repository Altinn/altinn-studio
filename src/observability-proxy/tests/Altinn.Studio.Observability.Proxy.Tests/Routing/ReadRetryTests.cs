using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Observability.Proxy.Tests.Routing;

/// <summary>
/// A read that cannot reach its storage copy while the health checks still pass it, as during the
/// first seconds of a node restart. The probe interval is far longer than any test, so the proxy
/// keeps both copies healthy throughout.
/// </summary>
public sealed class ReadRetryTests
{
    private const string ReadPath = "/internal/observability/metrics/api/v1/query";
    private const string ForwardingErrors = "altinn_observability_proxy_forwarding_errors_total";
    private const string Failovers = "altinn_observability_proxy_read_failovers_total";
    private const string HealthyDestination = "altinn_observability_proxy_read_destination_healthy";
    private const int ReadBodyLimit = 1024 * 1024;

    /// <summary>Nothing listens on port 1, so a connection there is refused.</summary>
    private const string RefusingAddress = "http://127.0.0.1:1";

    [Fact]
    public async Task Read_GoesToTheOtherCopy_WithoutMovingReads()
    {
        var firstAnswers = false;
        await using var first = await TestWebApplication.StartNamedDownstreamAsync(
            "a",
            () => true,
            () => Volatile.Read(ref firstAnswers)
        );
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        await using var proxy = await StartProxyAsync(first.Address, second.Address);

        var (status, body) = await GetAsync(proxy);
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal("b", body);

        Volatile.Write(ref firstAnswers, true);
        Assert.Equal("a", (await GetAsync(proxy)).Body);

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(ForwardingErrors) >= 1);
        Assert.Equal(
            1,
            metrics.Sum(
                ForwardingErrors,
                ("altinn_observability_proxy_destination", "a"),
                ("altinn_observability_proxy_signal", "metrics"),
                ("error_type", "request")
            )
        );
        Assert.Equal(0, metrics.Sum(Failovers));
    }

    [Fact]
    public async Task FormRead_IsSentAgainWithTheBodyTheFirstCopyRead()
    {
        // Grafana's Prometheus datasource sends its queries as a POSTed form. The first copy reads
        // all of it before going away, so the body has to be sent again from the buffer.
        await using var first = await StartBodyReadingDropperAsync();
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        await using var proxy = await StartProxyAsync(first.Address, second.Address);

        var query = new string('x', ReadBodyLimit - "query=".Length);
        using var request = new HttpRequestMessage(HttpMethod.Post, ReadPath)
        {
            Content = new StringContent($"query={query}", Encoding.ASCII, "application/x-www-form-urlencoded"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ProxyConfiguration.QueryToken);
        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            $"b query={query}",
            await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task FormRead_IsNotRetried_WhenItsBodyIsTooLargeOrOfUnknownLength(bool tooLarge)
    {
        await using var first = await StartBodyReadingDropperAsync();
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        await using var proxy = await StartProxyAsync(first.Address, second.Address);

        var body = Encoding.ASCII.GetBytes($"query={new string('x', tooLarge ? ReadBodyLimit : 16)}");
        HttpContent content = tooLarge ? new ByteArrayContent(body) : new StreamContent(new UnknownLengthStream(body));
        content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");
        using var request = new HttpRequestMessage(HttpMethod.Post, ReadPath) { Content = content };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ProxyConfiguration.QueryToken);
        if (!tooLarge)
        {
            request.Headers.TransferEncodingChunked = true;
        }

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Read_IsNotRetried_OnACopyTheHealthChecksFailed()
    {
        // With both copies failing their health checks, YARP offers both rather than none.
        await using var first = await TestWebApplication.StartNamedDownstreamAsync("a", () => false, () => false);
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => false);
        var configuration = ProxyConfiguration.WithBothTokens(second.Address);
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:0"] = first.Address;
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:1"] = second.Address;
        configuration["ObservabilityProxy:Downstreams:Storage:HealthCheckIntervalSeconds"] = "1";
        await using var proxy = await TestWebApplication.StartProxyAsync(configuration);
        var metrics = await proxy.ScrapeUntilAsync(scraped =>
            scraped
                .Series(HealthyDestination, ("altinn_observability_proxy_signal", "metrics"))
                .Count(sample => sample.Value < 0.5) == 2
        );
        Assert.Equal(0, metrics.Sum(HealthyDestination, ("altinn_observability_proxy_signal", "metrics")));

        Assert.Equal(HttpStatusCode.BadGateway, (await GetAsync(proxy)).Status);
    }

    [Fact]
    public async Task Read_FailsAsBefore_WhenTheOtherCopyCannotBeReachedEither()
    {
        await using var proxy = await StartProxyAsync(RefusingAddress, RefusingAddress);

        Assert.Equal(HttpStatusCode.BadGateway, (await GetAsync(proxy)).Status);

        var metrics = await proxy.ScrapeUntilAsync(scraped => scraped.Sum(ForwardingErrors) >= 2);
        Assert.Equal(1, metrics.Sum(ForwardingErrors, ("altinn_observability_proxy_destination", "a")));
        Assert.Equal(1, metrics.Sum(ForwardingErrors, ("altinn_observability_proxy_destination", "b")));
    }

    [Fact]
    public async Task ErrorResponse_IsNotRetried()
    {
        // A copy that answers is reachable, and its answer is the read's.
        await using var first = await TestWebApplication.StartDownstreamAsync(context =>
        {
            context.Response.StatusCode =
                context.Request.Path == "/health" ? StatusCodes.Status200OK : StatusCodes.Status422UnprocessableEntity;
            return Task.CompletedTask;
        });
        await using var second = await TestWebApplication.StartNamedDownstreamAsync("b", () => true);
        await using var proxy = await StartProxyAsync(first.Address, second.Address);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await GetAsync(proxy)).Status);
    }

    /// <summary>A copy that passes its health checks, and reads a request's body before dropping it.</summary>
    private static Task<TestWebApplication> StartBodyReadingDropperAsync() =>
        TestWebApplication.StartDownstreamAsync(async context =>
        {
            if (context.Request.Path != "/health")
            {
                using var reader = new StreamReader(context.Request.Body);
                await reader.ReadToEndAsync(context.RequestAborted);
                context.Abort();
            }
        });

    private static Task<TestWebApplication> StartProxyAsync(string first, string second)
    {
        var configuration = ProxyConfiguration.WithBothTokens(second);
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:0"] = first;
        configuration["ObservabilityProxy:Downstreams:Storage:Metrics:1"] = second;
        configuration["ObservabilityProxy:Downstreams:Storage:HealthCheckIntervalSeconds"] = "3600";
        return TestWebApplication.StartProxyAsync(configuration);
    }

    private static async Task<(HttpStatusCode Status, string Body)> GetAsync(TestWebApplication proxy)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{ReadPath}?query=up");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ProxyConfiguration.QueryToken);
        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);
        return (response.StatusCode, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    /// <summary>A body HttpClient cannot know the length of, so it is sent chunked.</summary>
    private sealed class UnknownLengthStream(byte[] content) : MemoryStream(content)
    {
        public override bool CanSeek => false;
    }
}
