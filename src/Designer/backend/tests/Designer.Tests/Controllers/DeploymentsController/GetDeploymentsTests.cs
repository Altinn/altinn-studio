using System;
using System.Collections.Generic;
using System.IO;
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

    // The test host's appsettings.json names studio.localhost, which is the prod Studio environment.
    private const string ThisStudioEnvironment = "prod";

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
        SetupRunning("tt02", new RunningAppDeployment("8", "1234", ThisStudioEnvironment));
        SetupRunning("at22", new RunningAppDeployment("6.1", "5678", "staging"));
        SetupRunning("production", new RunningAppDeployment("6", null, null));

        DeploymentsResponse actual = await GetDeploymentsResponse();

        Assert.Equal(8, actual.PipelineDeploymentList.Count);
        foreach (DeploymentEntity entity in actual.PipelineDeploymentList)
        {
            Assert.Equal(DateTimeKind.Utc, entity.Created.Kind);
            Assert.Equal(DateTimeKind.Utc, entity.Build.Started!.Value.Kind);
            Assert.Equal(DateTimeKind.Utc, entity.Build.Finished!.Value.Kind);
        }
        Assert.Equivalent(
            new[]
            {
                new RunningApp
                {
                    Environment = "tt02",
                    Version = "8",
                    DeployedFromThisStudio = true,
                    BuildId = "1234",
                },
                new RunningApp
                {
                    Environment = "at22",
                    Version = "6.1",
                    DeployedFromThisStudio = false,
                },
                new RunningApp { Environment = "production", Version = "6" },
            },
            actual.RunningAppList,
            strict: true
        );
    }

    [Fact]
    public async Task GetDeployments_LeavesOutEnvironmentsWhereTheAppIsNotKnownToRun()
    {
        SetupRunning("tt02", new RunningAppDeployment("8", null, null));
        SetupRunning("at22", null);
        SetupGatewayCall("production").ThrowsAsync(new HttpRequestException("Gateway unreachable"));

        DeploymentsResponse actual = await GetDeploymentsResponse();

        Assert.Equal("tt02", Assert.Single(actual.RunningAppList).Environment);
    }

    [Fact]
    public async Task GetDeployments_StillServesWhatOlderFrontendsRead()
    {
        SetupRunning("tt02", new RunningAppDeployment("8", "1234", ThisStudioEnvironment));
        SetupRunning("at22", null);
        SetupRunning("production", null);

        using JsonDocument response = JsonDocument.Parse(await GetDeploymentsJson());

        // A frontend loaded before runningAppList existed reads kubernetesDeploymentList, and fails without it.
        JsonElement legacy = Assert.Single(
            response.RootElement.GetProperty("kubernetesDeploymentList").EnumerateArray()
        );
        Assert.Equal("tt02", legacy.GetProperty("envName").GetString());
        Assert.Equal("8", legacy.GetProperty("version").GetString());
    }

    private async Task<DeploymentsResponse> GetDeploymentsResponse() =>
        JsonSerializer.Deserialize<DeploymentsResponse>(await GetDeploymentsJson(), JsonSerializerOptions);

    private async Task<string> GetDeploymentsJson()
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{VersionPrefix(Org, App)}?sortDirection=Descending"
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
