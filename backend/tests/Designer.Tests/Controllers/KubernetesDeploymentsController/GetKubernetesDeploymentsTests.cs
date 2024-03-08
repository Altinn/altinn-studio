using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.KubernetesDeploymentsController;

public class GetKubernetesDeployments : DisagnerEndpointsTestsBase<GetKubernetesDeployments>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IKubernetesDeploymentsService> _kubernetesDeploymentsMock = new Mock<IKubernetesDeploymentsService>();
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/kubernetesdeployments";
    public GetKubernetesDeployments(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
        services.AddSingleton(_ => _kubernetesDeploymentsMock.Object);
    }

    [Theory]
    [InlineData("ttd", "issue-6094")]
    public async Task GetKubernetesDeployments_OK(string org, string app)
    {
        // Arrange
        string uri = VersionPrefix(org, app);
        List<KubernetesDeployment> kubernetesDeployments = GetDeployments("completedDeployments.json");

        _kubernetesDeploymentsMock
            .Setup(rs => rs.GetAsync(org, app))
            .ReturnsAsync(kubernetesDeployments);

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

        // Act
        HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
        string responseString = await res.Content.ReadAsStringAsync();
        List<KubernetesDeployment> actual = JsonSerializer.Deserialize<List<KubernetesDeployment>>(responseString, JsonSerializerOptions);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(2, actual.Count);
    }

    private List<KubernetesDeployment> GetDeployments(string filename)
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
