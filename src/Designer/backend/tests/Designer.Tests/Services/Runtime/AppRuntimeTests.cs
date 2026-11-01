using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Services.Runtime;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Polly.Timeout;
using Xunit;

namespace Designer.Tests.Services.Runtime;

public class AppRuntimeTests
{
    private const string Org = "ttd";
    private const string App = "my-app";

    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly AppRuntime _appRuntime;

    public AppRuntimeTests()
    {
        _environmentsService
            .Setup(service => service.GetOrganizationEnvironments(Org, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<EnvironmentModel> { new() { Name = "tt02" } });

        _appRuntime = new AppRuntime(
            _environmentsService.Object,
            _runtimeGatewayClient.Object,
            new GeneralSettings { HostName = "altinn.studio" },
            NullLogger<AppRuntime>.Instance
        );
    }

    [Theory]
    [InlineData("1234")]
    [InlineData(null)]
    public async Task GetAll_WhenTheAppRuns_ReturnsItsVersionAndBuild(string buildId)
    {
        var restartedAt = new DateTimeOffset(2026, 10, 31, 10, 42, 0, TimeSpan.Zero);
        SetupGatewayCall().ReturnsAsync(new RunningAppDeployment("8", buildId, "prod", "ready", restartedAt));

        Assert.Equal(
            [new AppRunState.Running("tt02", "8", buildId, AppStatus.Ready, restartedAt, CanRestart: true)],
            await _appRuntime.GetAll(Org, App, CancellationToken.None)
        );
    }

    [Theory]
    [InlineData("ready", AppStatus.Ready)]
    [InlineData("updating", AppStatus.Updating)]
    [InlineData("stuck", AppStatus.Stuck)]
    [InlineData("degraded", AppStatus.Degraded)]
    [InlineData("unavailable", AppStatus.Unavailable)]
    public async Task GetAll_ReturnsTheStatusTheGatewayReports(string status, AppStatus expected)
    {
        SetupGatewayCall().ReturnsAsync(new RunningAppDeployment("8", null, "prod", status, null));

        var running = Assert.IsType<AppRunState.Running>(
            Assert.Single(await _appRuntime.GetAll(Org, App, CancellationToken.None))
        );
        Assert.Equal(expected, running.Status);
    }

    [Theory]
    [InlineData("prod", "ready", true)]
    [InlineData(null, "ready", true)] // Deployed before the pipeline recorded its Studio environment.
    [InlineData("dev", "ready", false)]
    [InlineData("prod", "hibernating", false)] // A status a newer gateway reports.
    [InlineData("prod", null, false)]
    public async Task GetAll_LetsThisStudioEnvironmentRestartOnlyWhatItMayHaveDeployed(
        string sourceEnvironment,
        string status,
        bool canRestart
    )
    {
        SetupGatewayCall().ReturnsAsync(new RunningAppDeployment("8", null, sourceEnvironment, status, null));

        var running = Assert.IsType<AppRunState.Running>(
            Assert.Single(await _appRuntime.GetAll(Org, App, CancellationToken.None))
        );
        Assert.Equal(canRestart, running.CanRestart);
    }

    [Fact]
    public async Task GetAll_WhenTheAppDoesNotRun_ReturnsNotRunning()
    {
        SetupGatewayCall().ReturnsAsync((RunningAppDeployment)null);

        Assert.Equal([new AppRunState.NotRunning("tt02")], await _appRuntime.GetAll(Org, App, CancellationToken.None));
    }

    public static TheoryData<Exception> EnvironmentFailures =>
        [new HttpRequestException("Gateway unreachable"), new TimeoutRejectedException(), new TaskCanceledException()];

    [Theory]
    [MemberData(nameof(EnvironmentFailures))]
    public async Task GetAll_WhenTheEnvironmentFails_ReturnsUnavailable(Exception failure)
    {
        SetupGatewayCall().ThrowsAsync(failure);

        Assert.Equal([new AppRunState.Unavailable("tt02")], await _appRuntime.GetAll(Org, App, CancellationToken.None));
    }

    [Fact]
    public async Task GetAll_WhenTheCallerCancels_Throws()
    {
        using var cancellation = new CancellationTokenSource();
        SetupGatewayCall()
            .Returns(() =>
            {
                cancellation.Cancel();
                return Task.FromCanceled<RunningAppDeployment>(cancellation.Token);
            });

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _appRuntime.GetAll(Org, App, cancellation.Token));
    }

    [Fact]
    public async Task Restart_WhenTheGatewayStartsIt_ReturnsTheAppAsItIsNow()
    {
        SetupGatewayCall().ReturnsAsync(new RunningAppDeployment("8", "1234", "prod", "ready", null));
        var restartedAt = new DateTimeOffset(2026, 10, 31, 10, 42, 0, TimeSpan.Zero);
        SetupRestart()
            .ReturnsAsync(
                new GatewayAppRestart.Started(new RunningAppDeployment("8", "1234", "prod", "updating", restartedAt))
            );

        Assert.Equal(
            new AppRestart.Started(
                new AppRunState.Running("tt02", "8", "1234", AppStatus.Updating, restartedAt, CanRestart: true)
            ),
            await _appRuntime.Restart(Org, App, "tt02", CancellationToken.None)
        );
    }

    public static TheoryData<GatewayAppRestart, AppRestart> GatewayRefusals =>
        new()
        {
            { new GatewayAppRestart.Updating(), new AppRestart.Updating() },
            { new GatewayAppRestart.Paused(), new AppRestart.Paused() },
            { new GatewayAppRestart.NotFound(), new AppRestart.NotRunning() },
        };

    [Theory]
    [MemberData(nameof(GatewayRefusals))]
    public async Task Restart_WhenTheGatewayRefuses_SaysWhy(GatewayAppRestart refusal, AppRestart expected)
    {
        SetupGatewayCall().ReturnsAsync(new RunningAppDeployment("8", "1234", "prod", "ready", null));
        SetupRestart().ReturnsAsync(refusal);

        Assert.Equal(expected, await _appRuntime.Restart(Org, App, "tt02", CancellationToken.None));
    }

    [Fact]
    public async Task Restart_WhenTheAppDoesNotRun_ReturnsNotRunning()
    {
        SetupGatewayCall().ReturnsAsync((RunningAppDeployment)null);

        Assert.Equal(new AppRestart.NotRunning(), await _appRuntime.Restart(Org, App, "tt02", CancellationToken.None));
    }

    [Fact]
    public async Task Restart_WhenAnotherStudioEnvironmentDeployedTheApp_LeavesItAlone()
    {
        SetupGatewayCall().ReturnsAsync(new RunningAppDeployment("8", "1234", "staging", "ready", null));

        Assert.Equal(
            new AppRestart.DeployedElsewhere(),
            await _appRuntime.Restart(Org, App, "tt02", CancellationToken.None)
        );
        _runtimeGatewayClient.Verify(
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

    private Moq.Language.Flow.ISetup<IRuntimeGatewayClient, Task<GatewayAppRestart>> SetupRestart() =>
        _runtimeGatewayClient.Setup(client =>
            client.RestartApp(
                Org,
                App,
                It.Is<AltinnEnvironment>(env => env.Name == "tt02"),
                It.IsAny<CancellationToken>()
            )
        );

    private Moq.Language.Flow.ISetup<IRuntimeGatewayClient, Task<RunningAppDeployment>> SetupGatewayCall() =>
        _runtimeGatewayClient.Setup(client =>
            client.GetRunningAppDeployment(
                Org,
                App,
                It.Is<AltinnEnvironment>(env => env.Name == "tt02"),
                It.IsAny<CancellationToken>()
            )
        );
}
