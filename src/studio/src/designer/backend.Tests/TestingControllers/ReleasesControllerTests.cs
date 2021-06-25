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

namespace Designer.Tests.TestingControllers
{
    public class ReleasesControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/designer/api/v1";
        private readonly JsonSerializerOptions _options;

        public ReleasesControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
            _options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            _options.Converters.Add(new JsonStringEnumConverter());
        }

        [Fact]
        public async Task GetReleases_NoLaggingReleases_PipelineServiceNotCalled()
        {
            // Arrange
            string uri = $"{_versionPrefix}/udi/kjaerestebesok/releases?sortBy=created&sortDirection=Descending";
            List<ReleaseEntity> completedReleases = GetReleasesList("completedReleases.json");

            Mock<IPipelineService> pipelineService = new Mock<IPipelineService>();
            Mock<IReleaseService> releaseService = new Mock<IReleaseService>();

            releaseService
                .Setup(rs => rs.GetAsync(It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<ReleaseEntity> { Results = completedReleases });

            HttpClient client = GetTestClient(releaseService.Object, pipelineService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<ReleaseEntity> searchResult = JsonSerializer.Deserialize<SearchResults<ReleaseEntity>>(responseString, _options);
            IEnumerable<ReleaseEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(5, actual.Count());
            Assert.DoesNotContain(actual, r => r.Build.Status == Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums.BuildStatus.InProgress);
            pipelineService.Verify(p => p.UpdateReleaseStatus(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            releaseService.VerifyAll();
        }

        [Fact]
        public async Task GetReleases_SingleLaggingRelease_PipelineServiceCalled()
        {
            // Arrange
            string uri = $"{_versionPrefix}/udi/kjaerestebesok/releases?sortBy=created&sortDirection=Descending";
            List<ReleaseEntity> completedReleases = GetReleasesList("singleLaggingRelease.json");

            Mock<IPipelineService> pipelineService = new Mock<IPipelineService>();
            pipelineService
                .Setup(ps => ps.UpdateReleaseStatus(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            Mock<IReleaseService> releaseService = new Mock<IReleaseService>();

            releaseService
                .Setup(rs => rs.GetAsync(It.IsAny<DocumentQueryModel>()))
                .ReturnsAsync(new SearchResults<ReleaseEntity> { Results = completedReleases });

            HttpClient client = GetTestClient(releaseService.Object, pipelineService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);
            string responseString = await res.Content.ReadAsStringAsync();
            SearchResults<ReleaseEntity> searchResult = JsonSerializer.Deserialize<SearchResults<ReleaseEntity>>(responseString, _options);
            IEnumerable<ReleaseEntity> actual = searchResult.Results;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(5, actual.Count());
            Assert.Contains(actual, r => r.Build.Status == Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums.BuildStatus.InProgress);
            pipelineService.Verify(p => p.UpdateReleaseStatus(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            releaseService.VerifyAll();
        }

        private List<ReleaseEntity> GetReleasesList(string filename)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ReleasesControllerTests).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, $@"..\..\..\_TestData\ReleasesCollection\{filename}");
            if (File.Exists(path))
            {
                string releases = File.ReadAllText(path);
                return JsonSerializer.Deserialize<List<ReleaseEntity>>(releases, _options);
            }

            return null;
        }

        private HttpClient GetTestClient(IReleaseService releasesService, IPipelineService pipelineService)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositoriesControllerTest).Assembly.Location).LocalPath);

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
                    services.AddSingleton(releasesService);
                    services.AddSingleton(pipelineService);
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            return client;
        }
    }
}
