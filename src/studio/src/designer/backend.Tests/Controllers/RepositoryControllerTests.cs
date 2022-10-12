using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class RepositoryControllerTests : ApiTestsBase<RepositoryController, RepositoryControllerTests>
    {
        private readonly string _versionPrefix = "/designer/api/v1";
        private readonly Mock<IRepository> _repositoryMock;

        public RepositoryControllerTests(WebApplicationFactory<RepositoryController> factory) : base(factory)
        {
            _repositoryMock = new Mock<IRepository>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddTransient(_ => _repositoryMock.Object);
        }

        [Fact]
        public async Task Contents_ContentsReturned_OK()
        {
            // Arrange
            string uri = $"{_versionPrefix}/repos/ttd/apps-test/contents";

            _repositoryMock
                .Setup(r => r.GetContents(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(new List<FileSystemObject>
                {
                    new FileSystemObject
                    {
                    Name = "appsettings.Development.json",
                    Encoding = "Unicode (UTF-8)",
                    Path = "App/appsettings.Development.json",
                    Type = "File"
                    }
                });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri)
            {
            };

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Contents_ContentsIsNull_BadRequest()
        {
            // Arrange
            string uri = $"{_versionPrefix}/repos/acn-sbuad/apps-test/contents?path=App";

            _repositoryMock
                .Setup(r => r.GetContents(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns((List<FileSystemObject>)null);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri)
            {
            };

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_RepoHasCreatedStatus_DeleteRepositoryIsNotCalled()
        {
            // Arrange
            string uri = $"/designer/api/v1/repos/copyapp?org=ttd&sourceRepository=apps-test&targetRepository=cloned-app";

            _repositoryMock
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Repository { RepositoryCreatedStatus = HttpStatusCode.Created, CloneUrl = "https://www.vg.no" });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_TargetRepoAlreadyExists_ConflictIsReturned()
        {
            // Arrange
            string uri = $"/designer/api/v1/repos/copyapp?org=ttd&sourceRepository=apps-test&targetRepository=existing-repo";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_GiteaTimeout_DeleteRepositoryIsCalled()
        {
            // Arrange
            string uri = $"/designer/api/v1/repos/copyapp?org=ttd&sourceRepository=apps-test&targetRepository=cloned-app";

            _repositoryMock
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Repository { RepositoryCreatedStatus = HttpStatusCode.GatewayTimeout });

            _repositoryMock
                 .Setup(r => r.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()));

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.GatewayTimeout, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_ExceptionIsThrownByService_InternalServerError()
        {
            // Arrange
            string uri = $"/designer/api/v1/repos/copyapp?org=ttd&sourceRepository=apps-test&targetRepository=cloned-app";

            _repositoryMock
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
               .Throws(new IOException());

            _repositoryMock
                 .Setup(r => r.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()));

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.InternalServerError, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_InvalidTargetRepoName_BadRequest()
        {
            // Arrange
            string uri = $"/designer/api/v1/repos/copyapp?org=ttd&sourceRepository=apps-test&targetRepository=2022-cloned-app";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_InvalidSourceRepoName_BadRequest()
        {
            // Arrange
            string uri = "/designer/api/v1/repos/copyapp?org=ttd&sourceRepository=ddd.git%3Furl%3D{herkanmannåfrittgjøreting}&targetRepository=cloned-target-app";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);
            string actual = await res.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
            Assert.Contains("is an invalid repository name", actual);
        }

        [Fact]
        public async Task CreateApp_InvalidRepoName_BadRequest()
        {
            // Arrange
            string uri = $"/designer/api/v1/repos/ttd&repository=2021-application";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CreateApp_ValidRepoName_Created()
        {
            // Arrange
            string uri = $"/designer/api/v1/repos/CreateApp?org=ttd&repository=test";

            _repositoryMock
                .Setup(r => r.CreateService(It.IsAny<string>(), It.IsAny<ServiceConfiguration>()))
                .ReturnsAsync(new Repository() { RepositoryCreatedStatus = HttpStatusCode.Created, CloneUrl = "https://some.site/this/is/not/relevant" });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }
    }
}
