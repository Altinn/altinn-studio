using System;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters.Deployments;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
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

    public RestartTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.RemoveAll<IRuntimeGatewayClient>();
        services.AddSingleton(_runtimeGatewayClientMock.Object);
    }

    [Fact]
    public async Task Restart_WhenTheGatewayStartsIt_ReturnsTheAppAsItIsNow()
    {
        var restartedAt = new DateTimeOffset(2026, 10, 31, 10, 42, 0, TimeSpan.Zero);
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

    private async Task<HttpResponseMessage> PostRestart(string environment)
    {
        using var content = new StringContent(
            JsonSerializer.Serialize(new { environment }),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        return await HttpClient.PostAsync($"/designer/api/{Org}/{App}/deployments/restart", content);
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
