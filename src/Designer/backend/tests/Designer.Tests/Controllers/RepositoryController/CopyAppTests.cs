using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class CopyAppTests(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<CopyAppTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly Mock<IRepository> _repositoryMock = new();
        private const string UrlPrefix = "/designer/api/repos/repo/ttd";
        private const string ValidSourceRepo = "apps-test";
        private const string ValidTargetRepo = "cloned-app";

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddSingleton(_ => _repositoryMock.Object);
        }

        [Fact]
        public async Task CopyApp_RepoHasCreatedStatus_DeleteRepositoryIsNotCalled()
        {
            // Arrange
            string uri = $"{UrlPrefix}/copy-app?sourceRepository={ValidSourceRepo}&targetRepository={ValidTargetRepo}";

            _repositoryMock
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Repository { RepositoryCreatedStatus = HttpStatusCode.Created, CloneUrl = "https://www.vg.no" });

            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_TargetRepoAlreadyExists_ConflictIsReturned()
        {
            // Arrange
            string existingRepo = "existing-repo";
            string uri = $"{UrlPrefix}/copy-app?sourceRepository={ValidSourceRepo}&targetRepository={existingRepo}";

            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_GiteaTimeout_DeleteRepositoryIsCalled()
        {
            // Arrange
            string uri = $"{UrlPrefix}/copy-app?sourceRepository={ValidSourceRepo}&targetRepository={ValidTargetRepo}";

            _repositoryMock
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Repository { RepositoryCreatedStatus = HttpStatusCode.GatewayTimeout });

            _repositoryMock
                 .Setup(r => r.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()));

            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.GatewayTimeout, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_ExceptionIsThrownByService_InternalServerError()
        {
            // Arrange
            string uri = $"{UrlPrefix}/copy-app?sourceRepository={ValidSourceRepo}&targetRepository={ValidTargetRepo}";

            _repositoryMock
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
               .Throws(new IOException());

            _repositoryMock
                 .Setup(r => r.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()));

            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.InternalServerError, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_InvalidTargetRepoName_BadRequest()
        {
            // Arrange
            string uri = $"{UrlPrefix}/copy-app?sourceRepository={ValidSourceRepo}&targetRepository=2022-{ValidTargetRepo}";

            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_InvalidSourceRepoName_BadRequest()
        {
            // Arrange
            string invalidSourceRepoName = "ddd.git?url={herkanmannåfrittgjøreting}";
            string uri = $"{UrlPrefix}/copy-app?sourceRepository={invalidSourceRepoName}&targetRepository={ValidTargetRepo}";

            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
            string actual = await res.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
            Assert.Contains("is an invalid repository name", actual);
        }

        [Fact]
        public async Task CopyApp_InvalidTargetOrgName_BadRequest()
        {
            // Arrange
            string invalidTargetOrgName = "org*with#invalid+chars";
            string uri = $"{UrlPrefix}/copy-app?sourceRepository={ValidSourceRepo}&targetRepository={ValidTargetRepo}&targetOrg={invalidTargetOrgName}";

            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
            string actual = await res.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
            Assert.Contains("is not a valid name for an organization", actual);
        }
    }
}
