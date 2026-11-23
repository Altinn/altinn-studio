using Altinn.Studio.Gateway.Api.Clients.WorkflowEngine;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class WorkflowEngineBaseUrlTests
{
    [Theory]
    // Under RFC 3986 reference resolution, a path-bearing base URL without a trailing slash
    // silently drops its last segment when relative upstream paths resolve against it.
    [InlineData("http://engine.svc.cluster.local", "http://engine.svc.cluster.local/")]
    [InlineData("http://engine.svc.cluster.local/", "http://engine.svc.cluster.local/")]
    [InlineData("http://engine.svc.cluster.local/engine", "http://engine.svc.cluster.local/engine/")]
    [InlineData("http://engine.svc.cluster.local/engine/", "http://engine.svc.cluster.local/engine/")]
    [InlineData("http://engine.svc.cluster.local:8080/a/b", "http://engine.svc.cluster.local:8080/a/b/")]
    public void NormalizeBaseUrl_EnsuresTrailingSlash(string configured, string expected)
    {
        var normalized = WorkflowEngineClientRegistration.NormalizeBaseUrl(new Uri(configured));

        Assert.Equal(expected, normalized.AbsoluteUri);
    }

    [Fact]
    public void NormalizeBaseUrl_KeepsRelativeResolutionIntact()
    {
        var baseUrl = WorkflowEngineClientRegistration.NormalizeBaseUrl(new Uri("http://engine.local/prefix"));

        var resolved = new Uri(baseUrl, "api/v1/ttd%2Fmy-app/collections");

        Assert.Equal("http://engine.local/prefix/api/v1/ttd%2Fmy-app/collections", resolved.AbsoluteUri);
    }
}
