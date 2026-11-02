using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Moq;
using Xunit;

namespace Designer.Tests.TypedHttpClients.RuntimeGateway;

public class RuntimeGatewayClientTests
{
    [Fact]
    public async Task GetReportMetricsAsync_ShouldSendThePeriodAsEscapedTimestamps()
    {
        Uri requestUri = null;
        using var handler = new RecordingHandler(request => requestUri = request.RequestUri);
        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory
            .Setup(factory => factory.CreateClient("runtime-gateway"))
            .Returns(() => new HttpClient(handler, disposeHandler: false));
        var environmentsService = new Mock<IEnvironmentsService>();
        environmentsService
            .Setup(service => service.GetAppClusterUri("ttd", "tt02"))
            .ReturnsAsync(new Uri("https://ttd.apps.tt02.altinn.no"));
        var generalSettings = new GeneralSettings { HostName = "altinn.studio" };
        var client = new RuntimeGatewayClient(httpClientFactory.Object, generalSettings, environmentsService.Object);

        await client.GetReportMetricsAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.FromHours(2)),
            new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.FromHours(1)),
            CancellationToken.None
        );

        Assert.Equal(
            "?from=2026-10-01T00%3A00%3A00.0000000%2B02%3A00&to=2026-11-01T00%3A00%3A00.0000000%2B01%3A00"
                + $"&originEnvironment={generalSettings.OriginEnvironment}",
            requestUri.Query
        );
    }

    [Fact]
    public async Task GetRunningAppDeployment_ReturnsTheDeploymentTheGatewayReports()
    {
        // The gateway's full response; Designer keeps only what it reads.
        using var handler = new RespondingHandler(
            HttpStatusCode.OK,
            new
            {
                release = "ttd-my-app",
                imageTag = "8",
                buildId = "1234",
                sourceEnvironment = "prod",
                deploymentId = "42",
            }
        );
        var client = CreateClient(handler);

        var deployment = await client.GetRunningAppDeployment(
            "ttd",
            "my-app",
            AltinnEnvironment.FromName("tt02"),
            CancellationToken.None
        );

        Assert.Equal(new RunningAppDeployment("8", "1234"), deployment);
        Assert.Equal(
            "https://ttd.apps.tt02.altinn.no/runtime/gateway/api/v1/deploy/apps/my-app/running",
            handler.RequestUri?.ToString()
        );
    }

    [Fact]
    public async Task GetRunningAppDeployment_WhenTheAppDoesNotRun_ReturnsNull()
    {
        using var handler = new RespondingHandler(HttpStatusCode.NotFound);
        var client = CreateClient(handler);

        var deployment = await client.GetRunningAppDeployment(
            "ttd",
            "my-app",
            AltinnEnvironment.FromName("tt02"),
            CancellationToken.None
        );

        Assert.Null(deployment);
    }

    [Fact]
    public async Task GetRunningAppDeployment_WhenTheGatewayFails_Throws()
    {
        using var handler = new RespondingHandler(HttpStatusCode.InternalServerError);
        var client = CreateClient(handler);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.GetRunningAppDeployment("ttd", "my-app", AltinnEnvironment.FromName("tt02"), CancellationToken.None)
        );
    }

    private static RuntimeGatewayClient CreateClient(HttpMessageHandler handler)
    {
        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory
            .Setup(factory => factory.CreateClient("runtime-gateway"))
            .Returns(() => new HttpClient(handler, disposeHandler: false));
        var environmentsService = new Mock<IEnvironmentsService>();
        environmentsService
            .Setup(service => service.GetAppClusterUri("ttd", "tt02", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Uri("https://ttd.apps.tt02.altinn.no"));
        return new RuntimeGatewayClient(
            httpClientFactory.Object,
            new GeneralSettings { HostName = "altinn.studio" },
            environmentsService.Object
        );
    }

    private sealed class RespondingHandler(HttpStatusCode statusCode, object body = null) : HttpMessageHandler
    {
        public Uri RequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            RequestUri = request.RequestUri;
            var response = new HttpResponseMessage(statusCode);
            if (body is not null)
            {
                response.Content = JsonContent.Create(body);
            }
            return Task.FromResult(response);
        }
    }

    private sealed class RecordingHandler(Action<HttpRequestMessage> record) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            record(request);
            return Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new ReportMetrics()) }
            );
        }
    }
}
