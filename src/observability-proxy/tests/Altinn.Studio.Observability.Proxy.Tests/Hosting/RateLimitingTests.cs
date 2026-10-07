using System.Net;

namespace Altinn.Studio.Observability.Proxy.Tests.Hosting;

public sealed class RateLimitingTests
{
    // The shared runtime identities cover tens of clusters each, so the limit has to be settable
    // per identity rather than one number for every source.
    [Fact]
    public async Task PerIdentityOverride_AppliesToThatIdentityOnly()
    {
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Downstreams:Agents:Traces"] = downstream.Address,
                ["ObservabilityProxy:RateLimiting:PermitLimit"] = "1",
                ["ObservabilityProxy:RateLimiting:PermitLimits:runtime-prod"] = "3",
                ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "runtime-token",
                ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "runtime-prod",
                ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "otlp",
                ["ObservabilityProxy:Authentication:Tokens:1:Token"] = "studio-token",
                ["ObservabilityProxy:Authentication:Tokens:1:SourceIdentity"] = "studio-prod",
                ["ObservabilityProxy:Authentication:Tokens:1:AllowedRouteGroups:0"] = "otlp",
            }
        );

        // The overridden identity gets its own window of three.
        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "runtime-token"));
        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "runtime-token"));
        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "runtime-token"));
        Assert.Equal(HttpStatusCode.TooManyRequests, await PostAsync(proxy, "runtime-token"));

        // An identity with no entry falls back to the default, and its window is its own: the
        // requests above did not consume it.
        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "studio-token"));
        Assert.Equal(HttpStatusCode.TooManyRequests, await PostAsync(proxy, "studio-token"));
    }

    [Fact]
    public async Task Rejection_SaysWhenToRetry()
    {
        // The otlphttp exporter waits for Retry-After on a 429 rather than its own backoff.
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Downstreams:Agents:Traces"] = downstream.Address,
                ["ObservabilityProxy:RateLimiting:PermitLimit"] = "1",
                ["ObservabilityProxy:RateLimiting:WindowSeconds"] = "60",
                ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "studio-token",
                ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "studio-prod",
                ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "otlp",
            }
        );

        Assert.Equal(HttpStatusCode.OK, await PostAsync(proxy, "studio-token"));

        using var request = new HttpRequestMessage(HttpMethod.Post, "/internal/observability/otlp/v1/traces");
        request.Headers.Authorization = new("Bearer", "studio-token");
        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        var retryAfter = response.Headers.RetryAfter?.Delta;
        Assert.NotNull(retryAfter);
        Assert.InRange(retryAfter.Value, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(60));
    }

    [Fact]
    public async Task RejectedRequests_DoNotSpendTheIdentitysPermits()
    {
        // Authentication and authorization run before the limiter, so neither an unknown token nor
        // a refused path can use up a source's window.
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        var configuration = ProxyConfiguration.WithBothTokens(downstream.Address);
        configuration["ObservabilityProxy:RateLimiting:PermitLimit"] = "1";
        await using var proxy = await TestWebApplication.StartProxyAsync(configuration);

        for (var attempt = 0; attempt < 3; attempt++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, await PostAsync(proxy, "unknown-token"));
            Assert.Equal(
                404,
                await proxy.SendRawAsync(
                    "POST",
                    "/internal/observability/metrics/api/v1/write",
                    ProxyConfiguration.QueryToken
                )
            );
        }

        Assert.Equal(
            200,
            await proxy.SendRawAsync(
                "GET",
                "/internal/observability/metrics/api/v1/query",
                ProxyConfiguration.QueryToken
            )
        );
        Assert.Equal(
            429,
            await proxy.SendRawAsync(
                "GET",
                "/internal/observability/metrics/api/v1/query",
                ProxyConfiguration.QueryToken
            )
        );
    }

    private static async Task<HttpStatusCode> PostAsync(TestWebApplication proxy, string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/internal/observability/otlp/v1/traces");
        request.Headers.Authorization = new("Bearer", token);

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);
        return response.StatusCode;
    }
}
