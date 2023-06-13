using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Controllers;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

public class GetDeployments : DeploymentsControllerTestsBase<GetDeployments>
{
    public GetDeployments(WebApplicationFactory<DeploymentsController> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "issue-6094")]
        public async Task GetDeployments_NoLaggingDeployments_PipelineServiceNotCalled(string org, string app)
        {
            // Arrange
            string uri = $"{VersionPrefix(org, app)}?sortDirection=Descending";
            List<DeploymentEntity> completedDeployments = GetDeploymentsList("completedDeployments.json");

            DeploymentServiceMock
                .Setup(rs => rs.GetAsync(org, app, It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<DeploymentEntity> { Results = completedDeployments });

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<DeploymentEntity> searchResult = JsonSerializer.Deserialize<SearchResults<DeploymentEntity>>(responseString, Options);
            IEnumerable<DeploymentEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(8, actual.Count());
            Assert.DoesNotContain(actual, r => r.Build.Status == BuildStatus.InProgress);
            DeploymentServiceMock.Verify(p => p.UpdateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            DeploymentServiceMock.Verify(r => r.GetAsync(org, app, It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "issue-6094")]
        public async Task GetDeployments_SingleLaggingDeployments_PipelineServiceCalled(string org, string app)
        {
            // Arrange
            string uri = $"{VersionPrefix(org, app)}?sortDirection=Descending";
            List<DeploymentEntity> completedDeployments = GetDeploymentsList("singleLaggingDeployment.json");

            DeploymentServiceMock
                .Setup(ps => ps.UpdateAsync(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            DeploymentServiceMock
                .Setup(rs => rs.GetAsync(org, app, It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<DeploymentEntity> { Results = completedDeployments });

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<DeploymentEntity> searchResult = JsonSerializer.Deserialize<SearchResults<DeploymentEntity>>(responseString, Options);
            IEnumerable<DeploymentEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(8, actual.Count());
            Assert.Contains(actual, r => r.Build.Status == BuildStatus.InProgress);
            DeploymentServiceMock.Verify(p => p.UpdateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            DeploymentServiceMock.Verify(r => r.GetAsync(org, app, It.IsAny<DocumentQueryModel>()), Times.Once);
        }

        private List<DeploymentEntity> GetDeploymentsList(string filename)
        {
            string path = Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "Deployments", filename);
            if (!File.Exists(path))
            {
                return null;
            }

            string deployments = File.ReadAllText(path);
            return JsonSerializer.Deserialize<List<DeploymentEntity>>(deployments, Options);

        }
}
