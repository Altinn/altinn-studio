using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Services.Runtime;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class GetDeployments
    : DbDesignerEndpointsTestsBase<GetDeployments>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "issue-6094";

    private readonly Mock<IEnvironmentsService> _environmentsServiceMock = new();
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClientMock = new();

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/deployments";

    public GetDeployments(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture)
    {
        _environmentsServiceMock
            .Setup(service => service.GetOrganizationEnvironments(Org, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new() { Name = "tt02" }, new() { Name = "at22" }, new() { Name = "production" }]);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton<IGiteaClient, IGiteaClientMock>();
        services.RemoveAll<IEnvironmentsService>();
        services.AddSingleton(_environmentsServiceMock.Object);
        services.RemoveAll<IRuntimeGatewayClient>();
        services.AddSingleton(_runtimeGatewayClientMock.Object);
    }

    [Fact]
    public async Task GetDeployments_OK()
    {
        List<DeploymentEntity> completedDeployments = GetDeploymentsList("completedDeployments.json");
        await DesignerDbFixture.PrepareEntitiesInDatabase(completedDeployments);
        SetupRunning("tt02", new RunningAppDeployment("8", "142287", "prod", "updating", null));
        SetupRunning("at22", new RunningAppDeployment("6.1", null, null, "ready", null));
        SetupRunning("production", null);

        DeploymentsResponse actual = await GetDeploymentsResponse();
        DateTime? FinishedOf(string buildId) =>
            actual.PipelineDeploymentList.Single(deployment => deployment.Build.Id == buildId).Build.Finished;

        Assert.Equal(8, actual.PipelineDeploymentList.Count);
        foreach (DeploymentEntity deployment in actual.PipelineDeploymentList)
        {
            Assert.Equal(DateTimeKind.Utc, deployment.Created.Kind);
            Assert.Equal(DateTimeKind.Utc, deployment.Build.Started!.Value.Kind);
            Assert.Equal(DateTimeKind.Utc, deployment.Build.Finished!.Value.Kind);
        }
        Assert.Equivalent(
            new[]
            {
                new AppInEnvironment
                {
                    Environment = "tt02",
                    State = AppInEnvironmentState.Running,
                    RunningApp = new RunningApp
                    {
                        Environment = "tt02",
                        Version = "8",
                        BuildId = "142287",
                        Status = AppStatus.Updating,
                        CanRestart = true,
                        // The deploy whose build runs.
                        PublishedAt = FinishedOf("142287"),
                    },
                },
                new AppInEnvironment
                {
                    Environment = "at22",
                    State = AppInEnvironmentState.Running,
                    RunningApp = new RunningApp
                    {
                        Environment = "at22",
                        Version = "6.1",
                        Status = AppStatus.Ready,
                        CanRestart = true,
                        // Without a build id, the latest deploy of the tag.
                        PublishedAt = FinishedOf("142224"),
                    },
                },
                new AppInEnvironment { Environment = "production", State = AppInEnvironmentState.NotRunning },
            },
            actual.EnvironmentList,
            strict: true
        );

        // A limited list still tells when what runs was published.
        DeploymentsResponse newestOnly = JsonSerializer.Deserialize<DeploymentsResponse>(
            await GetDeploymentsJson("&top=1"),
            JsonSerializerOptions
        );
        Assert.Single(newestOnly.PipelineDeploymentList);
        Assert.Equivalent(actual.EnvironmentList, newestOnly.EnvironmentList, strict: true);
    }

    [Fact]
    public async Task GetDeployments_WhenAnEnvironmentCannotTell_SaysItIsUnknown()
    {
        SetupRunning("tt02", new RunningAppDeployment("8", null, null, "ready", null));
        SetupRunning("at22", null);
        SetupGatewayCall("production").ThrowsAsync(new HttpRequestException("Gateway unreachable"));

        DeploymentsResponse actual = await GetDeploymentsResponse();

        Assert.Equal(
            [
                ("tt02", AppInEnvironmentState.Running),
                ("at22", AppInEnvironmentState.NotRunning),
                ("production", AppInEnvironmentState.Unknown),
            ],
            actual.EnvironmentList.Select(environment => (environment.Environment, environment.State))
        );
    }

    [Fact]
    public async Task GetDeployments_StillServesWhatOlderFrontendsRead()
    {
        SetupRunning("tt02", new RunningAppDeployment("8", "1234", "prod", "ready", null));
        SetupRunning("at22", null);
        SetupGatewayCall("production").ThrowsAsync(new HttpRequestException("Gateway unreachable"));

        using JsonDocument response = JsonDocument.Parse(await GetDeploymentsJson());

        // A frontend loaded before environmentList existed reads runningAppList, and shows the app as not published
        // in every environment without it.
        JsonElement running = Assert.Single(response.RootElement.GetProperty("runningAppList").EnumerateArray());
        Assert.Equal("tt02", running.GetProperty("environment").GetString());
        Assert.Equal("8", running.GetProperty("version").GetString());
        Assert.Equal("1234", running.GetProperty("buildId").GetString());
    }

    private async Task<DeploymentsResponse> GetDeploymentsResponse() =>
        JsonSerializer.Deserialize<DeploymentsResponse>(await GetDeploymentsJson(), JsonSerializerOptions);

    private async Task<string> GetDeploymentsJson(string extraQuery = "")
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{VersionPrefix(Org, App)}?sortDirection=Descending{extraQuery}"
        );
        using HttpResponseMessage response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadAsStringAsync();
    }

    private void SetupRunning(string environment, RunningAppDeployment deployment) =>
        SetupGatewayCall(environment).ReturnsAsync(deployment);

    private Moq.Language.Flow.ISetup<IRuntimeGatewayClient, Task<RunningAppDeployment>> SetupGatewayCall(
        string environment
    ) =>
        _runtimeGatewayClientMock.Setup(client =>
            client.GetRunningAppDeployment(
                Org,
                App,
                It.Is<AltinnEnvironment>(env => env.Name == environment),
                It.IsAny<CancellationToken>()
            )
        );

    private List<DeploymentEntity> GetDeploymentsList(string filename)
    {
        string path = Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "Deployments", filename);
        if (!File.Exists(path))
        {
            return null;
        }

        string deployments = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<DeploymentEntity>>(deployments, JsonSerializerOptions);
    }
}
