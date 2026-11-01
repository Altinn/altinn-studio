using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Designer.Filters.Deployments;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class RestartTests : DesignerEndpointsTestsBase<RestartTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "my-app";
    private const string Environment = "tt02";

    // The tests' Studio environment, from its host name.
    private const string ThisStudioEnvironment = "prod";

    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClientMock = new(MockBehavior.Strict);
    private readonly Mock<IDeploymentService> _deploymentServiceMock = new();

    public RestartTests(WebApplicationFactory<Program> factory)
        : base(factory) => SetupDeployments();

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.RemoveAll<IRuntimeGatewayClient>();
        services.AddSingleton(_runtimeGatewayClientMock.Object);
        services.RemoveAll<IDeploymentService>();
        services.AddSingleton(_deploymentServiceMock.Object);
    }

    [Fact]
    public async Task Restart_WhenTheGatewayStartsIt_ReturnsTheAppAsItIsNow()
    {
        var restartedAt = new DateTimeOffset(2026, 10, 31, 10, 42, 0, TimeSpan.Zero);
        var publishedAt = new DateTime(2026, 10, 30, 9, 0, 0, DateTimeKind.Utc);
        SetupDeployments(
            new DeploymentEntity
            {
                EnvName = Environment,
                TagName = "8",
                Build = new BuildEntity { Id = "1234", Finished = publishedAt },
            }
        );
        SetupRunning(Running("ready"));
        SetupRestart()
            .ReturnsAsync(
                new GatewayAppRestart.Started(
                    new RunningAppDeployment("8", "1234", ThisStudioEnvironment, "updating", restartedAt)
                )
            );

        using HttpResponseMessage response = await PostRestart(Environment);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        using JsonDocument body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(Environment, body.RootElement.GetProperty("environment").GetString());
        Assert.Equal("updating", body.RootElement.GetProperty("status").GetString());
        Assert.Equal(restartedAt, body.RootElement.GetProperty("restartedAt").GetDateTimeOffset());
        Assert.True(body.RootElement.GetProperty("canRestart").GetBoolean());
        // A restart keeps the deploy that runs, so the page can still tell which change was the latest.
        Assert.Equal(publishedAt, body.RootElement.GetProperty("publishedAt").GetDateTime());
    }

    [Fact]
    public async Task Restart_KeepsTheTraceThatRecordsWhoRestarted()
    {
        var requestSpans = new ConcurrentBag<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == "Microsoft.AspNetCore",
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = requestSpans.Add,
        };
        ActivitySource.AddActivityListener(listener);
        SetupRunning(Running("ready"));
        SetupRestart().ReturnsAsync(new GatewayAppRestart.Started(Running("updating")));

        ActivityTraceId traceId = ActivityTraceId.CreateRandom();

        using HttpResponseMessage response = await PostRestart(
            Environment,
            traceParent: $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01"
        );

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Activity requestSpan = Assert.Single(requestSpans, span => span.TraceId == traceId);
        Assert.Equal("always", requestSpan.GetTagItem(AltinnAttributes.Sampling));
    }

    public static TheoryData<GatewayAppRestart, HttpStatusCode, string> GatewayRefusals =>
        new()
        {
            { new GatewayAppRestart.Updating(), HttpStatusCode.Conflict, DeploymentErrorCodes.AppUpdating },
            { new GatewayAppRestart.Paused(), HttpStatusCode.Conflict, DeploymentErrorCodes.AppPaused },
            { new GatewayAppRestart.NotFound(), HttpStatusCode.NotFound, DeploymentErrorCodes.AppNotRunning },
        };

    [Theory]
    [MemberData(nameof(GatewayRefusals))]
    public async Task Restart_WhenTheGatewayRefuses_ReturnsWhy(
        GatewayAppRestart refusal,
        HttpStatusCode expectedStatus,
        string expectedErrorCode
    )
    {
        SetupRunning(Running("ready"));
        SetupRestart().ReturnsAsync(refusal);

        using HttpResponseMessage response = await PostRestart(Environment);

        await AssertProblem(response, expectedStatus, expectedErrorCode);
    }

    [Fact]
    public async Task Restart_WhenTheAppDoesNotRun_ReturnsNotFound()
    {
        SetupRunning(null);

        using HttpResponseMessage response = await PostRestart(Environment);

        await AssertProblem(response, HttpStatusCode.NotFound, DeploymentErrorCodes.AppNotRunning);
    }

    [Fact]
    public async Task Restart_WhenAnotherStudioEnvironmentDeployedTheApp_DoesNotRestartIt()
    {
        SetupRunning(Running("ready", sourceEnvironment: "dev"));

        using HttpResponseMessage response = await PostRestart(Environment);

        await AssertProblem(response, HttpStatusCode.Conflict, DeploymentErrorCodes.AppDeployedElsewhere);
        _runtimeGatewayClientMock.Verify(
            client =>
                client.RestartApp(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Restart_WithoutDeployPermissionForTheEnvironment_ReturnsForbidden()
    {
        using HttpResponseMessage response = await PostRestart("production");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static RunningAppDeployment Running(string status, string sourceEnvironment = ThisStudioEnvironment) =>
        new("8", "1234", sourceEnvironment, status, null);

    private async Task<HttpResponseMessage> PostRestart(string environment, string traceParent = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/designer/api/{Org}/{App}/deployments/restart")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { environment }),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };
        if (traceParent is not null)
        {
            request.Headers.Add("traceparent", traceParent);
        }

        return await HttpClient.SendAsync(request);
    }

    private static async Task AssertProblem(
        HttpResponseMessage response,
        HttpStatusCode expectedStatus,
        string expectedErrorCode
    )
    {
        Assert.Equal(expectedStatus, response.StatusCode);
        using JsonDocument body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(expectedErrorCode, body.RootElement.GetProperty("errorCode").GetString());
    }

    private void SetupDeployments(params DeploymentEntity[] deployments) =>
        _deploymentServiceMock
            .Setup(service => service.GetAsync(Org, App, It.IsAny<DocumentQueryModel>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResults<DeploymentEntity> { Results = deployments });

    private void SetupRunning(RunningAppDeployment deployment) =>
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetRunningAppDeployment(
                    Org,
                    App,
                    It.Is<AltinnEnvironment>(env => env.Name == Environment),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(deployment);

    private Moq.Language.Flow.ISetup<IRuntimeGatewayClient, Task<GatewayAppRestart>> SetupRestart() =>
        _runtimeGatewayClientMock.Setup(client =>
            client.RestartApp(
                Org,
                App,
                It.Is<AltinnEnvironment>(env => env.Name == Environment),
                It.IsAny<CancellationToken>()
            )
        );
}
