using System.Net;

namespace Altinn.Studio.Observability.Proxy.Tests.Auth;

public sealed class StaticBearerTokenTests
{
    [Fact]
    public async Task MissingToken_Returns401()
    {
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "accepted-token",
                ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "runtime-prod",
                ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "otlp",
            }
        );

        using var response = await proxy.Client.PostAsync(
            new Uri("/internal/observability/otlp/v1/traces", UriKind.Relative),
            null,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("Bearer", response.Headers.WwwAuthenticate.Single().Scheme);
    }

    [Fact]
    public async Task InvalidToken_Returns401()
    {
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "accepted-token",
                ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "runtime-prod",
                ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "otlp",
            }
        );

        using var request = new HttpRequestMessage(HttpMethod.Post, "/internal/observability/otlp/v1/traces");
        request.Headers.Authorization = new("Bearer", "wrong-token");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ValidTokenWithoutRoutePermission_Returns403()
    {
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Authentication:Tokens:0:Token"] = "ingest-token",
                ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "runtime-prod",
                ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "otlp",
            }
        );

        using var request = new HttpRequestMessage(HttpMethod.Get, "/internal/observability/metrics/api/v1/query");
        request.Headers.Authorization = new("Bearer", "ingest-token");

        using var response = await proxy.Client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
