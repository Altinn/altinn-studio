using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Moq;
using Xunit;

namespace Designer.Tests.TypedHttpClients.RuntimeGateway;

public class RuntimeGatewayClientActivitySignalsTests
{
    private const string SignalsJson = """
        {
          "status": "ok",
          "windowDays": 29,
          "generatedAt": "2026-10-13T12:00:00+00:00",
          "apps": [
            {
              "app": "my-app",
              "signals": [ { "category": "write", "count": 42.5, "lastSeenAt": "2026-10-12T08:00:00+00:00" } ]
            }
          ]
        }
        """;

    [Fact]
    public async Task GetAppActivitySignalsAsync_ShouldRequestSignalsEndpointAndDeserializeContract()
    {
        var handler = new StubHandler(HttpStatusCode.OK, SignalsJson);
        var client = CreateClient(handler);

        var response = await client.GetAppActivitySignalsAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            29,
            CancellationToken.None
        );

        Assert.NotNull(handler.RequestUri);
        Assert.Equal("ttd.apps.tt02.altinn.no", handler.RequestUri.Host);
        Assert.EndsWith("/runtime/gateway/api/v1/metrics/app/activity/signals", handler.RequestUri.AbsolutePath);
        Assert.Equal("?windowDays=29", handler.RequestUri.Query);
        Assert.Equal("ok", response.Status);
        Assert.Equal(29, response.WindowDays);
        var app = Assert.Single(response.Apps);
        Assert.Equal("my-app", app.App);
        var signal = Assert.Single(app.Signals);
        Assert.Equal("write", signal.Category);
        Assert.Equal(42.5, signal.Count);
        Assert.Equal(new DateTimeOffset(2026, 10, 12, 8, 0, 0, TimeSpan.Zero), signal.LastSeenAt);
    }

    [Fact]
    public async Task GetAppActivitySignalsAsync_WhenEndpointIsMissing_ShouldThrowNotFound()
    {
        var client = CreateClient(new StubHandler(HttpStatusCode.NotFound, string.Empty));

        var exception = await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.GetAppActivitySignalsAsync("ttd", AltinnEnvironment.FromName("tt02"), 2, CancellationToken.None)
        );

        Assert.Equal(HttpStatusCode.NotFound, exception.StatusCode);
    }

    private static RuntimeGatewayClient CreateClient(StubHandler handler)
    {
        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory
            .Setup(f => f.CreateClient("runtime-gateway-activity-signals"))
            .Returns(() => new HttpClient(handler, false));
        var environmentsService = new Mock<IEnvironmentsService>();
        environmentsService
            .Setup(s => s.GetAppClusterUri("ttd", "tt02"))
            .ReturnsAsync(new Uri("https://ttd.apps.tt02.altinn.no"));
        return new RuntimeGatewayClient(httpClientFactory.Object, new GeneralSettings(), environmentsService.Object);
    }

    private sealed class StubHandler(HttpStatusCode statusCode, string content) : HttpMessageHandler
    {
        public Uri RequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            RequestUri = request.RequestUri;
            return Task.FromResult(
                new HttpResponseMessage(statusCode)
                {
                    Content = new StringContent(content, Encoding.UTF8, "application/json"),
                }
            );
        }
    }
}
