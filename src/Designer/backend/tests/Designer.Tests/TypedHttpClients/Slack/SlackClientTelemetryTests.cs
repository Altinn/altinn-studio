using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hosting;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using OpenTelemetry;
using OpenTelemetry.Trace;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using Xunit;

namespace Designer.Tests.TypedHttpClients.Slack;

public class SlackClientTelemetryTests : IDisposable
{
    private const string WebhookPath = "/services/T000/B000/webhook-secret";

    private readonly WireMockServer _server = WireMockServer.Start();

    [Fact]
    public async Task SendMessageAsync_RecordsWebhookUrlWithoutPath()
    {
        _server
            .Given(Request.Create().WithPath(WebhookPath).UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200));
        var spans = new List<Activity>();
        using (
            TracerProvider tracerProvider = Sdk.CreateTracerProviderBuilder()
                .AddHttpClientInstrumentation(TelemetryExtensions.ConfigureHttpClientTracing)
                .AddInMemoryExporter(spans)
                .Build()
        )
        {
            using var httpClient = new HttpClient();
            var slackClient = new SlackClient(httpClient);

            await slackClient.SendMessageAsync(new Uri(_server.Url + WebhookPath), new SlackMessage { Text = "test" });
        }

        Activity span = Assert.Single(spans, IsRequestToServer);
        Assert.Equal(_server.Url + "/REDACTED", span.GetTagItem("url.full"));
        Assert.DoesNotContain(
            span.TagObjects,
            tag => tag.Value?.ToString()?.Contains("webhook-secret", StringComparison.Ordinal) == true
        );
    }

    [Fact]
    public async Task UnmarkedRequest_KeepsUrlPath()
    {
        _server
            .Given(Request.Create().WithPath("/api/status").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200));
        var spans = new List<Activity>();
        using (
            TracerProvider tracerProvider = Sdk.CreateTracerProviderBuilder()
                .AddHttpClientInstrumentation(TelemetryExtensions.ConfigureHttpClientTracing)
                .AddInMemoryExporter(spans)
                .Build()
        )
        {
            using var httpClient = new HttpClient();
            using HttpResponseMessage response = await httpClient.GetAsync(_server.Url + "/api/status");
        }

        Activity span = Assert.Single(spans, IsRequestToServer);
        Assert.Equal(_server.Url + "/api/status", span.GetTagItem("url.full"));
    }

    // The tracer provider sees every HTTP client call in the test process, including other tests' calls.
    private bool IsRequestToServer(Activity span) =>
        span.GetTagItem("url.full") is string url && url.StartsWith(_server.Url, StringComparison.Ordinal);

    public void Dispose() => _server.Stop();
}
