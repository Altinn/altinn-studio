using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Moq;
using Xunit;

namespace Designer.Tests.TypedHttpClients.AltinnStorage;

public class AltinnStorageMetricsClientTests
{
    private const string MetricsJson = """
        {
          "org": "ttd",
          "date": "2026-11-10",
          "computedAt": "2026-11-11T02:30:00Z",
          "apps": [
            {
              "app": "kpi-a",
              "instancesCreated": 3,
              "instancesCompleted": 2,
              "secondsToCompleteP50": 600,
              "openInstances": 5,
              "openOver90Days": 1,
              "unconfirmedOver90Days": 4,
              "openByTask": [ { "taskId": "Task_1", "openInstances": 5 } ]
            },
            {
              "app": "kpi-b",
              "instancesCreated": 0,
              "instancesCompleted": 0,
              "secondsToCompleteP50": null,
              "openInstances": 0,
              "openOver90Days": 0,
              "unconfirmedOver90Days": 7,
              "openByTask": []
            }
          ]
        }
        """;

    [Fact]
    public async Task GetDailyMetrics_ShouldRequestStorageForTheEnvironmentAndDeserializeContract()
    {
        var handler = new StubHandler(HttpStatusCode.OK, MetricsJson);
        var client = CreateClient(handler);

        var metrics = await client.GetDailyMetrics("ttd", "tt02", new DateOnly(2026, 11, 10), CancellationToken.None);

        Assert.NotNull(handler.RequestUri);
        Assert.Equal("platform.tt02.altinn.no", handler.RequestUri.Host);
        Assert.Equal("/storage/api/v1/studio/metrics/ttd", handler.RequestUri.AbsolutePath);
        Assert.Equal("?date=2026-11-10", handler.RequestUri.Query);
        Assert.Equal("ttd", metrics.Org);
        Assert.Equal(new DateOnly(2026, 11, 10), metrics.Date);
        Assert.Equal(new DateTimeOffset(2026, 11, 11, 2, 30, 0, TimeSpan.Zero), metrics.ComputedAt);
        Assert.Equal(2, metrics.Apps.Count);
        var appA = metrics.Apps[0];
        Assert.Equal("kpi-a", appA.App);
        Assert.Equal(3, appA.InstancesCreated);
        Assert.Equal(2, appA.InstancesCompleted);
        Assert.Equal(600, appA.SecondsToCompleteP50);
        Assert.Equal(5, appA.OpenInstances);
        Assert.Equal(1, appA.OpenOver90Days);
        Assert.Equal(4, appA.UnconfirmedOver90Days);
        var task = Assert.Single(appA.OpenByTask);
        Assert.Equal("Task_1", task.TaskId);
        Assert.Equal(5, task.OpenInstances);
        var appB = metrics.Apps[1];
        Assert.Null(appB.SecondsToCompleteP50);
        Assert.Equal(7, appB.UnconfirmedOver90Days);
        Assert.Empty(appB.OpenByTask);
    }

    [Fact]
    public async Task GetDailyMetrics_WithEmptyBody_ShouldThrow()
    {
        var client = CreateClient(new StubHandler(HttpStatusCode.OK, "null"));

        await Assert.ThrowsAsync<System.Text.Json.JsonException>(() =>
            client.GetDailyMetrics("ttd", "tt02", new DateOnly(2026, 11, 10), CancellationToken.None)
        );
    }

    private static AltinnStorageMetricsClient CreateClient(StubHandler handler)
    {
        var environmentsService = new Mock<IEnvironmentsService>();
        environmentsService
            .Setup(s => s.CreatePlatformUri("tt02"))
            .ReturnsAsync(new Uri("https://platform.tt02.altinn.no/"));
        return new AltinnStorageMetricsClient(
            new HttpClient(handler, false),
            environmentsService.Object,
            new PlatformSettings { ApiStorageMetricsUri = "storage/api/v1/studio/metrics/" }
        );
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
