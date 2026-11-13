using Altinn.Studio.EnvTopology;
using LocalTest.Configuration;
using Xunit;

namespace LocalTest.Tests.Configuration;

public sealed class BoundTopologyComponentRouteExtensionsTests
{
    private const string WorkflowEngineHost = "workflow-engine.local.altinn.cloud";

    [Theory]
    [InlineData(
        "http://local.altinn.cloud:8100",
        WorkflowEngineHost,
        "",
        "http://workflow-engine.local.altinn.cloud:8100/"
    )]
    [InlineData("http://local.altinn.cloud", WorkflowEngineHost, "", "http://workflow-engine.local.altinn.cloud/")]
    [InlineData("https://local.altinn.cloud", WorkflowEngineHost, "", "https://workflow-engine.local.altinn.cloud/")]
    [InlineData(
        "http://local.altinn.cloud:8000",
        "local.altinn.cloud",
        "/grafana",
        "http://local.altinn.cloud:8000/grafana"
    )]
    public void PublicUrl_KeepsSchemeAndPortOfBaseUrl(string baseUrl, string host, string pathPrefix, string expected)
    {
        var route = new BoundTopologyComponentRoute(
            new BoundTopologyRoute
            {
                Match = new BoundTopologyRouteMatch { Host = host, PathPrefix = pathPrefix },
            },
            httpDestinationUri: null
        );

        Assert.Equal(expected, route.PublicUrl(baseUrl));
    }
}
