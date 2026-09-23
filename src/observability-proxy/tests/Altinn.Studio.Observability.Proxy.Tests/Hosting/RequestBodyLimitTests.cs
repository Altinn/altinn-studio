using System.Net;
using Altinn.Studio.Observability.Proxy.Hosting;

namespace Altinn.Studio.Observability.Proxy.Tests.Hosting;

public sealed class RequestBodyLimitTests
{
    [Fact]
    public void Limit_IsTheLoadBalancers50Mebibytes()
    {
        // nginx's client_max_body_size 50m in src/load-balancer/k8s/extra-locations.conf.
        Assert.Equal(52428800, ObservabilityProxyExtensions.MaxRequestBodyBytes);
    }

    [Fact]
    public async Task BodyAboveKestrelsDefault_IsForwarded()
    {
        // Kestrel's own default is 30 MB, below what the load balancer lets through.
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        using var response = await PostAsync(proxy, 40 * 1024 * 1024);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            (40 * 1024 * 1024).ToString(System.Globalization.CultureInfo.InvariantCulture),
            response.Headers.GetValues("X-Observed-Body-Length").Single()
        );
    }

    [Fact]
    public async Task BodyAboveTheLimit_IsRejectedWithoutReachingTheBackend()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            ProxyConfiguration.WithBothTokens(downstream.Address)
        );

        // Announced rather than sent: Kestrel answers from the Content-Length and closes the
        // connection, which a client still sending 50 MiB sees as a broken pipe instead.
        var status = await proxy.SendRawAsync(
            "POST",
            "/internal/observability/otlp/v1/logs",
            ProxyConfiguration.IngestToken,
            ObservabilityProxyExtensions.MaxRequestBodyBytes + 1
        );

        Assert.Equal(413, status);
        Assert.Empty(downstream.ReceivedPaths);
    }

    private static async Task<HttpResponseMessage> PostAsync(TestWebApplication proxy, long length)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/internal/observability/otlp/v1/logs");
        request.Headers.Authorization = new("Bearer", ProxyConfiguration.IngestToken);
        request.Content = new ByteArrayContent(new byte[length]);
        return await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);
    }
}
