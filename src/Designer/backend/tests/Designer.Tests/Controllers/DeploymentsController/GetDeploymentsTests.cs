using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class GetDeployments : DbDesignerEndpointsTestsBase<GetDeployments>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IKubernetesDeploymentsService> _kubernetesDeploymentsMock = new Mock<IKubernetesDeploymentsService>();

    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/deployments";

    public GetDeployments(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture) : base(factory, designerDbFixture)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton<IGitea, IGiteaMock>();
        services.AddSingleton(_ => _kubernetesDeploymentsMock.Object);
    }

    [Theory]
    [InlineData("ttd", "issue-6094")]
    public async Task GetDeployments_OK(string org, string app)
    {
        // Arrange
        string uri = $"{VersionPrefix(org, app)}?sortDirection=Descending";
        List<DeploymentEntity> completedDeployments = GetDeploymentsList("completedDeployments.json");
        List<KubernetesDeployment> kubernetesDeployments = GetKubernetesDeploymentsList("completedDeployments.json");

        await DesignerDbFixture.PrepareEntitiesInDatabase(completedDeployments);

        _kubernetesDeploymentsMock
            .Setup(rs => rs.GetAsync(org, app))
            .ReturnsAsync(kubernetesDeployments);

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

        // Act
        HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
        string responseString = await res.Content.ReadAsStringAsync();
        DeploymentsResponse actual = JsonSerializer.Deserialize<DeploymentsResponse>(responseString, JsonSerializerOptions);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(8, actual.PipelineDeploymentList.Count);
        Assert.Equal(2, actual.KubernetesDeploymentList.Count);
        foreach (DeploymentEntity entity in actual.PipelineDeploymentList)
        {
            Assert.Equal(DateTimeKind.Utc, entity.Created.Kind);
            Assert.Equal(DateTimeKind.Utc, entity.Build.Started!.Value.Kind);
            Assert.Equal(DateTimeKind.Utc, entity.Build.Finished!.Value.Kind);
        }
    }

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

    private List<KubernetesDeployment> GetKubernetesDeploymentsList(string filename)
    {
        string path = Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "KubernetesDeployments", filename);
        if (!File.Exists(path))
        {
            return null;
        }

        string deployments = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<KubernetesDeployment>>(deployments, JsonSerializerOptions);
    }
}
