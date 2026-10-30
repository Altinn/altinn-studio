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

    [Fact]
    public async Task GetAll_WhenThisStudioDeployed_ReturnsRunningWithItsBuild()
    {
        SetupGatewayCall().ReturnsAsync(new RunningAppDeployment("8", "1234", "prod"));

        Assert.Equal(
            [new AppRunState.Running("tt02", "8", "1234")],
            await _appRuntime.GetAll(Org, App, CancellationToken.None)
        );
    }

    [Theory]
    [InlineData("staging", "1234")]
    [InlineData(null, null)]
    public async Task GetAll_WhenTheBuildIsNotThisStudios_ReturnsRunningWithoutABuild(
        string sourceEnvironment,
        string buildId
    )
    {
        SetupGatewayCall().ReturnsAsync(new RunningAppDeployment("8", buildId, sourceEnvironment));

        Assert.Equal(
            [new AppRunState.Running("tt02", "8", null)],
            await _appRuntime.GetAll(Org, App, CancellationToken.None)
        );
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
