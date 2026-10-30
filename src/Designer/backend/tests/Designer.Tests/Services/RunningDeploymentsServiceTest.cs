using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class RunningDeploymentsServiceTest
{
    private const string Org = "ttd";
    private const string App = "my-app";

    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly RunningDeploymentsService _service;

    public RunningDeploymentsServiceTest()
    {
        _environmentsService
            .Setup(service => service.GetOrganizationEnvironments(Org, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new List<EnvironmentModel>
                {
                    new() { Name = "tt02" },
                    new() { Name = "at22" },
                    new() { Name = "production" },
                }
            );

        _service = new RunningDeploymentsService(
            _environmentsService.Object,
            _runtimeGatewayClient.Object,
            new GeneralSettings { HostName = "altinn.studio" },
            NullLogger<RunningDeploymentsService>.Instance
        );
    }

    [Fact]
    public async Task GetAsync_ReturnsTheVersionRunningInEachEnvironment_AndSkipsWhereTheAppDoesNotRun()
    {
        SetupRunning("tt02", new RunningAppDeployment("8", "1234", "prod"));
        SetupRunning("at22", new RunningAppDeployment("6.1", null, null));
        SetupRunning("production", null);

        var deployments = await _service.GetAsync(Org, App, CancellationToken.None);

        Assert.Equivalent(
            new[]
            {
                new RunningDeployment
                {
                    EnvName = "tt02",
                    Version = "8",
                    BuildId = "1234",
                },
                new RunningDeployment { EnvName = "at22", Version = "6.1" },
            },
            deployments,
            strict: true
        );
    }

    [Fact]
    public async Task GetAsync_WhenAnotherStudioEnvironmentDeployed_LeavesOutItsBuild()
    {
        SetupRunning("tt02", new RunningAppDeployment("8", "1234", "staging"));
        SetupRunning("at22", null);
        SetupRunning("production", null);

        var deployments = await _service.GetAsync(Org, App, CancellationToken.None);

        var deployment = Assert.Single(deployments);
        Assert.Equal("8", deployment.Version);
        Assert.Null(deployment.BuildId);
    }

    [Fact]
    public async Task GetAsync_WhenAnEnvironmentFails_ReturnsTheOthers()
    {
        SetupRunning("tt02", new RunningAppDeployment("8", null, null));
        SetupRunning("at22", null);
        SetupGatewayCall("production").ThrowsAsync(new HttpRequestException("Gateway unreachable"));

        var deployments = await _service.GetAsync(Org, App, CancellationToken.None);

        Assert.Equal("tt02", Assert.Single(deployments).EnvName);
    }

    [Fact]
    public async Task GetAsync_WhenTheCallerCancels_Throws()
    {
        using var cancellation = new CancellationTokenSource();
        _runtimeGatewayClient
            .Setup(client =>
                client.GetRunningAppDeployment(Org, App, It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>())
            )
            .Returns(
                (string _, string _, AltinnEnvironment _, CancellationToken ct) =>
                {
                    cancellation.Cancel();
                    return Task.FromCanceled<RunningAppDeployment>(ct);
                }
            );

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _service.GetAsync(Org, App, cancellation.Token));
    }

    private void SetupRunning(string environment, RunningAppDeployment deployment) =>
        SetupGatewayCall(environment).ReturnsAsync(deployment);

    private Moq.Language.Flow.ISetup<IRuntimeGatewayClient, Task<RunningAppDeployment>> SetupGatewayCall(
        string environment
    ) =>
        _runtimeGatewayClient.Setup(client =>
            client.GetRunningAppDeployment(
                Org,
                App,
                It.Is<AltinnEnvironment>(env => env.Name == environment),
                It.IsAny<CancellationToken>()
            )
        );
}
