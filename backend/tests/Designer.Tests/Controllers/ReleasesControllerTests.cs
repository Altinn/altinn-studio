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
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class ReleasesControllerTests : ApiTestsBase<ReleasesController, ReleasesControllerTests>
    {
        private readonly string _versionPrefix = "/designer/api/v1";
        private readonly JsonSerializerOptions _options;

        private readonly Mock<IReleaseService> _releaseServiceMock;
        private readonly Mock<IPipelineService> _pipelineServiceMock;

        public ReleasesControllerTests(WebApplicationFactory<ReleasesController> factory) : base(factory)
        {
            _options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            _options.Converters.Add(new JsonStringEnumConverter());
            _releaseServiceMock = new Mock<IReleaseService>();
            _pipelineServiceMock = new Mock<IPipelineService>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddSingleton(_releaseServiceMock.Object);
            services.AddSingleton(_pipelineServiceMock.Object);
        }

        [Fact]
        public async Task GetReleases_NoLaggingReleases_PipelineServiceNotCalled()
        {
            // Arrange
            string uri = $"{_versionPrefix}/udi/kjaerestebesok/releases?sortDirection=Descending";
            List<ReleaseEntity> completedReleases = GetReleasesList("completedReleases.json");

            _releaseServiceMock
                .Setup(rs => rs.GetAsync(It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<ReleaseEntity> { Results = completedReleases });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<ReleaseEntity> searchResult = JsonSerializer.Deserialize<SearchResults<ReleaseEntity>>(responseString, _options);
            IEnumerable<ReleaseEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(5, actual.Count());
            Assert.DoesNotContain(actual, r => r.Build.Status == BuildStatus.InProgress);
            _pipelineServiceMock.Verify(p => p.UpdateReleaseStatus(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            _releaseServiceMock.VerifyAll();
        }

        [Fact]
        public async Task GetReleases_SingleLaggingRelease_PipelineServiceCalled()
        {
            // Arrange
            string uri = $"{_versionPrefix}/udi/kjaerestebesok/releases?sortDirection=Descending";
            List<ReleaseEntity> completedReleases = GetReleasesList("singleLaggingRelease.json");

            _pipelineServiceMock
                .Setup(ps => ps.UpdateReleaseStatus(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _releaseServiceMock
                .Setup(rs => rs.GetAsync(It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<ReleaseEntity> { Results = completedReleases });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<ReleaseEntity> searchResult = JsonSerializer.Deserialize<SearchResults<ReleaseEntity>>(responseString, _options);
            IEnumerable<ReleaseEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(5, actual.Count());
            Assert.Contains(actual, r => r.Build.Status == BuildStatus.InProgress);
            _pipelineServiceMock.Verify(p => p.UpdateReleaseStatus(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            _releaseServiceMock.VerifyAll();
        }

        private List<ReleaseEntity> GetReleasesList(string filename)
        {
            string path = Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData", "ReleasesCollection", filename);
            if (File.Exists(path))
            {
                string releases = File.ReadAllText(path);
                return JsonSerializer.Deserialize<List<ReleaseEntity>>(releases, _options);
            }

            return null;
        }
    }
}
