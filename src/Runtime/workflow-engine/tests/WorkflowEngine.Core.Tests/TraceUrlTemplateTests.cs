using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests the trace link template <c>GET /dashboard/config</c> hands the dashboard, which substitutes the URL-encoded
/// trace ID for <c>{traceId}</c> and nothing else.
/// </summary>
public class TraceUrlTemplateTests
{
    private const string TraceId = "4bf92f3577b34da6a3ce929d0e0e4736";

    /// <summary>The dashboard's substitution, as <c>buildTraceUrl()</c> in <c>core/helpers.js</c> does it.</summary>
    private static string Substitute(string template, string traceId) =>
        template.Replace(DashboardSettings.TraceIdPlaceholder, Uri.EscapeDataString(traceId), StringComparison.Ordinal);

    [Fact]
    public void Resolve_Neither_ReturnsNull()
    {
        Assert.Null(TraceUrlTemplate.Resolve(new DashboardSettings()));
    }

    [Theory]
    [InlineData("https://grafana.example.com", null)]
    [InlineData(null, "engine-traces")]
    public void Resolve_HalfAGrafanaPair_ReturnsNull(string? grafana, string? datasourceUid)
    {
        var dashboard = new DashboardSettings { GrafanaUrl = grafana, GrafanaTracesDatasourceUid = datasourceUid };

        Assert.Null(TraceUrlTemplate.Resolve(dashboard));
    }

    [Fact]
    public void Resolve_Template_ReturnsItUnchanged()
    {
        var dashboard = new DashboardSettings { TraceUrlTemplate = "http://localhost:18888/traces/detail/{traceId}" };

        Assert.Equal("http://localhost:18888/traces/detail/{traceId}", TraceUrlTemplate.Resolve(dashboard));
    }

    [Fact]
    public void Resolve_TemplateAndGrafanaPair_TemplateWins()
    {
        var dashboard = new DashboardSettings
        {
            TraceUrlTemplate = "http://localhost:18888/traces/detail/{traceId}",
            GrafanaUrl = "https://grafana.example.com",
            GrafanaTracesDatasourceUid = "engine-traces",
        };

        Assert.Equal("http://localhost:18888/traces/detail/{traceId}", TraceUrlTemplate.Resolve(dashboard));
    }

    /// <summary>
    /// The expected URLs are what the dashboard's former <c>grafanaTraceUrl()</c> returned for the same settings and
    /// trace ID, captured by running it in Node: a host keeping the Grafana pair gets the same links as before.
    /// </summary>
    [Theory]
    [InlineData(
        "http://local.altinn.cloud:8000/grafana/",
        "altinn-studio-traces",
        "4bf92f3577b34da6a3ce929d0e0e4736",
        "http://local.altinn.cloud:8000/grafana/explore?schemaVersion=1&panes=%7B%22trace%22%3A%7B%22datasource%22%3A%22altinn-studio-traces%22%2C%22queries%22%3A%5B%7B%22refId%22%3A%22A%22%2C%22datasource%22%3A%7B%22type%22%3A%22tempo%22%2C%22uid%22%3A%22altinn-studio-traces%22%7D%2C%22queryType%22%3A%22traceql%22%2C%22query%22%3A%224bf92f3577b34da6a3ce929d0e0e4736%22%7D%5D%2C%22range%22%3A%7B%22from%22%3A%22now-24h%22%2C%22to%22%3A%22now%22%7D%7D%7D"
    )]
    [InlineData(
        "https://grafana.example.com",
        "engine_traces-1",
        "0af7651916cd43dd8448eb211c80319c",
        "https://grafana.example.com/explore?schemaVersion=1&panes=%7B%22trace%22%3A%7B%22datasource%22%3A%22engine_traces-1%22%2C%22queries%22%3A%5B%7B%22refId%22%3A%22A%22%2C%22datasource%22%3A%7B%22type%22%3A%22tempo%22%2C%22uid%22%3A%22engine_traces-1%22%7D%2C%22queryType%22%3A%22traceql%22%2C%22query%22%3A%220af7651916cd43dd8448eb211c80319c%22%7D%5D%2C%22range%22%3A%7B%22from%22%3A%22now-24h%22%2C%22to%22%3A%22now%22%7D%7D%7D"
    )]
    public void Resolve_GrafanaPair_BuildsTheFormerGrafanaExploreUrl(
        string grafana,
        string datasourceUid,
        string traceId,
        string expected
    )
    {
        var dashboard = new DashboardSettings { GrafanaUrl = grafana, GrafanaTracesDatasourceUid = datasourceUid };

        string? template = TraceUrlTemplate.Resolve(dashboard);

        Assert.NotNull(template);
        Assert.True(TraceUrlTemplate.IsValid(template));
        Assert.Equal(expected, Substitute(template, traceId));
    }

    [Theory]
    [InlineData("http://localhost:18888/traces/detail/{traceId}")]
    [InlineData("https://traces.example.com/trace?id={traceId}&view=full")]
    [InlineData("https://traces.example.com/{traceId}/{traceId}")]
    public void IsValid_AbsoluteHttpUrlWithPlaceholder_IsTrue(string template)
    {
        Assert.True(TraceUrlTemplate.IsValid(template));
        Assert.DoesNotContain("{", Substitute(template, TraceId), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("http://localhost:18888/traces/detail/")]
    [InlineData("http://localhost:18888/traces/detail/{traceid}")]
    [InlineData("http://localhost:18888/traces/detail/{TraceId}")]
    [InlineData("http://localhost:18888/traces/detail/{ traceId }")]
    [InlineData("/traces/detail/{traceId}")]
    [InlineData("localhost:18888/traces/detail/{traceId}")]
    [InlineData("ftp://traces.example.com/{traceId}")]
    [InlineData("javascript:alert('{traceId}')")]
    public void IsValid_RelativeNonHttpOrWithoutTheExactPlaceholder_IsFalse(string template)
    {
        Assert.False(TraceUrlTemplate.IsValid(template));
    }
}
