using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
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

public class KubernetesDeploymentsServiceTest
{
    private const string Org = "ttd";
    private const string App = "my-app";

    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly KubernetesDeploymentsService _service;

    public KubernetesDeploymentsServiceTest()
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

        _service = new KubernetesDeploymentsService(
            _environmentsService.Object,
            _runtimeGatewayClient.Object,
            NullLogger<KubernetesDeploymentsService>.Instance
        );
    }

    [Fact]
    public async Task GetAsync_ReturnsTheVersionRunningInEachEnvironment_AndSkipsWhereTheAppDoesNotRun()
    {
        SetupRunning("tt02", new RunningAppDeployment($"{Org}-{App}", "8"));
        SetupRunning("at22", new RunningAppDeployment($"{Org}-{App}", "6.1"));
        SetupRunning("production", null);

        var deployments = await _service.GetAsync(Org, App, CancellationToken.None);

        Assert.Equivalent(
            new[]
            {
                new KubernetesDeployment
                {
                    EnvName = "tt02",
                    Release = $"{Org}-{App}",
                    Version = "8",
                },
                new KubernetesDeployment
                {
                    EnvName = "at22",
                    Release = $"{Org}-{App}",
                    Version = "6.1",
                },
            },
            deployments,
            strict: true
        );
    }

    [Fact]
    public async Task GetAsync_WhenAnEnvironmentFails_ReturnsTheOthers()
    {
        SetupRunning("tt02", new RunningAppDeployment($"{Org}-{App}", "8"));
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
