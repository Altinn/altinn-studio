using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// Integration tests that verify authentication works correctly through the ingress.
/// These tests require a running kind cluster with the gateway deployed.
/// </summary>
[Trait("Category", "Kubernetes")]
public sealed class HealthEndpointIntegrationTests : IAsyncLifetime
{
    private static readonly Uri _healthEndpoint = new("/runtime/gateway/api/v1/health", UriKind.Relative);

    private readonly HttpClient _client;

    public HealthEndpointIntegrationTests()
    {
        _client = new HttpClient { BaseAddress = new Uri("http://localhost:8020") };
    }

    public ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task ForwardedHeaders_ProcessesXForwardedFor()
    {
        // Verifies that X-Forwarded-For header processing works correctly.
        // Traefik is configured to pass through X-Forwarded-For headers (forwardedHeaders.insecure),
        // and ASP.NET Core's ForwardedHeaders middleware should resolve it as RemoteIpAddress.
        // This simulates what happens in production where Traefik sets these headers.
        var ct = TestContext.Current.CancellationToken;
        var clientIpEndpoint = new Uri("/runtime/gateway/api/v1/debug/clientip", UriKind.Relative);
        var expectedClientIp = "203.0.113.195";

        using var request = new HttpRequestMessage(HttpMethod.Get, clientIpEndpoint);
        request.Headers.Add("X-Forwarded-For", expectedClientIp);

        var response = await _client.SendAsync(request, ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync(ct);
        var json = JsonDocument.Parse(content);
        var remoteIp = json.RootElement.GetProperty("remoteIp").GetString();

        Assert.Equal(expectedClientIp, remoteIp);
    }

    [Fact]
    public async Task Health_WithValidToken_ReturnsOk()
    {
        var ct = TestContext.Current.CancellationToken;
        var token = FakeMaskinportenTokenGenerator.GenerateValidToken();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync(_healthEndpoint, ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Health_WithoutToken_ReturnsUnauthorized()
    {
        var ct = TestContext.Current.CancellationToken;
        _client.DefaultRequestHeaders.Authorization = null;

        var response = await _client.GetAsync(_healthEndpoint, ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Health_WithWrongScope_ReturnsForbidden()
    {
        var ct = TestContext.Current.CancellationToken;
        var token = FakeMaskinportenTokenGenerator.GenerateTokenWithWrongScope();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync(_healthEndpoint, ct);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Health_WithExpiredToken_ReturnsUnauthorized()
    {
        var ct = TestContext.Current.CancellationToken;
        var token = FakeMaskinportenTokenGenerator.GenerateExpiredToken();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync(_healthEndpoint, ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
