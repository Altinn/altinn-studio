using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Moq;

using Xunit;

namespace Designer.Tests.Controllers
{
    public class DeploymentsControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/designer/api/v1";
        private readonly JsonSerializerOptions _options;

        public DeploymentsControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
            _options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            _options.Converters.Add(new JsonStringEnumConverter());
        }

        [Fact]
        public async Task GetDeployments_NoLaggingDeployments_PipelineServiceNotCalled()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/issue-6094/deployments?sortDirection=Descending";
            List<DeploymentEntity> completedDeployments = GetDeploymentsList("completedDeployments.json");

            Mock<IPipelineService> pipelineService = new Mock<IPipelineService>();
            Mock<IDeploymentService> deploymentService = new Mock<IDeploymentService>();

            deploymentService
                .Setup(rs => rs.GetAsync(It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<DeploymentEntity> { Results = completedDeployments });

            HttpClient client = GetTestClient(deploymentService.Object, pipelineService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<DeploymentEntity> searchResult = JsonSerializer.Deserialize<SearchResults<DeploymentEntity>>(responseString, _options);
            IEnumerable<DeploymentEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(8, actual.Count());
            Assert.DoesNotContain(actual, r => r.Build.Status == Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums.BuildStatus.InProgress);
            pipelineService.Verify(p => p.UpdateDeploymentStatus(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            deploymentService.Verify(r => r.GetAsync(It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        [Fact]
        public async Task GetDeployments_SingleLaggingDeployments_PipelineServiceCalled()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/issue-6094/deployments?sortDirection=Descending";
            List<DeploymentEntity> completedDeployments = GetDeploymentsList("singleLaggingDeployment.json");

            Mock<IPipelineService> pipelineService = new Mock<IPipelineService>();
            pipelineService
                .Setup(ps => ps.UpdateDeploymentStatus(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            Mock<IDeploymentService> deploymentService = new Mock<IDeploymentService>();

            deploymentService
                .Setup(rs => rs.GetAsync(It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<DeploymentEntity> { Results = completedDeployments });

            HttpClient client = GetTestClient(deploymentService.Object, pipelineService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<DeploymentEntity> searchResult = JsonSerializer.Deserialize<SearchResults<DeploymentEntity>>(responseString, _options);
            IEnumerable<DeploymentEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(8, actual.Count());
            Assert.Contains(actual, r => r.Build.Status == Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums.BuildStatus.InProgress);
            pipelineService.Verify(p => p.UpdateDeploymentStatus(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            deploymentService.Verify(r => r.GetAsync(It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        private List<DeploymentEntity> GetDeploymentsList(string filename)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DeploymentsControllerTests).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, $@"..\..\..\_TestData\Deployments\{filename}");
            if (File.Exists(path))
            {
                string deployments = File.ReadAllText(path);
                return JsonSerializer.Deserialize<List<DeploymentEntity>>(deployments, _options);
            }

            return null;
        }

        private HttpClient GetTestClient(IDeploymentService deploymentService, IPipelineService pipelineService)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositoryControllerTests).Assembly.Location).LocalPath);

            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((context, conf) =>
                {
                    conf.AddJsonFile("appsettings.json");
                });

                var configuration = new ConfigurationBuilder()
                    .AddJsonFile("appsettings.json")
                    .Build();

                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IGitea, IGiteaMock>();
                    services.AddSingleton(deploymentService);
                    services.AddSingleton(pipelineService);
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            return client;
        }
    }
}
