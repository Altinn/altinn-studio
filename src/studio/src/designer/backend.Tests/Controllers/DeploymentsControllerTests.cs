using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class DeploymentsControllerTests : ApiTestsBase<DeploymentsController, DeploymentsControllerTests>
    {
        private readonly string _versionPrefix = "/designer/api/v1";
        private readonly JsonSerializerOptions _options;
        private readonly Mock<IDeploymentService> _deploymentServiceMock;
        private readonly Mock<IPipelineService> _pipelineServiceMock;

        public DeploymentsControllerTests(WebApplicationFactory<DeploymentsController> factory) : base(factory)
        {
            _options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            _options.Converters.Add(new JsonStringEnumConverter());
            _deploymentServiceMock = new Mock<IDeploymentService>();
            _pipelineServiceMock = new Mock<IPipelineService>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddSingleton(_deploymentServiceMock.Object);
            services.AddSingleton(_pipelineServiceMock.Object);
        }

        [Fact]
        public async Task GetDeployments_NoLaggingDeployments_PipelineServiceNotCalled()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/issue-6094/deployments?sortDirection=Descending";
            List<DeploymentEntity> completedDeployments = GetDeploymentsList("completedDeployments.json");

            _deploymentServiceMock
                .Setup(rs => rs.GetAsync(It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<DeploymentEntity> { Results = completedDeployments });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<DeploymentEntity> searchResult = JsonSerializer.Deserialize<SearchResults<DeploymentEntity>>(responseString, _options);
            IEnumerable<DeploymentEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(8, actual.Count());
            Assert.DoesNotContain(actual, r => r.Build.Status == BuildStatus.InProgress);
            _pipelineServiceMock.Verify(p => p.UpdateDeploymentStatus(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _deploymentServiceMock.Verify(r => r.GetAsync(It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        [Fact]
        public async Task GetDeployments_SingleLaggingDeployments_PipelineServiceCalled()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/issue-6094/deployments?sortDirection=Descending";
            List<DeploymentEntity> completedDeployments = GetDeploymentsList("singleLaggingDeployment.json");

            _pipelineServiceMock
                .Setup(ps => ps.UpdateDeploymentStatus(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _deploymentServiceMock
                .Setup(rs => rs.GetAsync(It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<DeploymentEntity> { Results = completedDeployments });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<DeploymentEntity> searchResult = JsonSerializer.Deserialize<SearchResults<DeploymentEntity>>(responseString, _options);
            IEnumerable<DeploymentEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(8, actual.Count());
            Assert.Contains(actual, r => r.Build.Status == BuildStatus.InProgress);
            _pipelineServiceMock.Verify(p => p.UpdateDeploymentStatus(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            _deploymentServiceMock.Verify(r => r.GetAsync(It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        private List<DeploymentEntity> GetDeploymentsList(string filename)
        {
            string path = Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "Deployments", filename);
            if (File.Exists(path))
            {
                string deployments = File.ReadAllText(path);
                return JsonSerializer.Deserialize<List<DeploymentEntity>>(deployments, _options);
            }

            return null;
        }
    }
}
