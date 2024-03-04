using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class GetDeployments : DisagnerEndpointsTestsBase<GetDeployments>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IDeploymentService> _deploymentServiceMock = new Mock<IDeploymentService>();
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/deployments";
    public GetDeployments(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
        services.AddSingleton(_ => _deploymentServiceMock.Object);
    }

    [Theory]
    [InlineData("ttd", "issue-6094")]
    public async Task GetDeployments_OK(string org, string app)
    {
        // Arrange
        string uri = $"{VersionPrefix(org, app)}?sortDirection=Descending";
        List<DeploymentEntity> pipelineDeployments = GetPipelineDeployments("completed.json");
        List<KubernetesDeployment> kubernetesDeployments = GetKubernetesDeployments("completed.json");

        _deploymentServiceMock
            .Setup(rs => rs.GetAsync(org, app, It.IsAny<DocumentQueryModel>()))
            .ReturnsAsync(new Deployment { PipelineDeploymentList = pipelineDeployments, KubernetesDeploymentList = kubernetesDeployments });

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

        // Act
        HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
        string responseString = await res.Content.ReadAsStringAsync();
        SearchResults<DeploymentEntity> searchResult = JsonSerializer.Deserialize<SearchResults<DeploymentEntity>>(responseString, JsonSerializerOptions);
        IEnumerable<DeploymentEntity> actual = searchResult.Results;

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(8, actual.Count());
        Assert.DoesNotContain(actual, r => r.Build.Status == BuildStatus.InProgress);
        _deploymentServiceMock.Verify(p => p.UpdateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        _deploymentServiceMock.Verify(r => r.GetAsync(org, app, It.IsAny<DocumentQueryModel>()), Times.Once);
    }

    private List<DeploymentEntity> GetPipelineDeployments(string filename)
    {
        string path = Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "Deployments", "PipelineDeployemnts", filename);
        if (!File.Exists(path))
        {
            return null;
        }

        string deployments = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<DeploymentEntity>>(deployments, JsonSerializerOptions);
    }

    private List<KubernetesDeployment> GetKubernetesDeployments(string filename)
    {
        string path = Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "Deployments", "KubernetesDeployments", filename);
        if (!File.Exists(path))
        {
            return null;
        }

        string deployments = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<KubernetesDeployment>>(deployments, JsonSerializerOptions);
    }
}
