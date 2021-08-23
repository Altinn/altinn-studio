using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;

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
    public class RepositoriesControllerTest : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/designer/api/v1";

        public RepositoriesControllerTest(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Contents_ContentsReturned_OK()
        {
            // Arrange
            string uri = $"{_versionPrefix}/repositories/ttd/apps-test/contents";

            Mock<IRepository> repositoryService = new Mock<IRepository>();
            repositoryService
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

            HttpClient client = GetTestClient(repositoryService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri)
            {
            };
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Contents_ContentsIsNull_BadRequest()
        {
            // Arrange
            string uri = $"{_versionPrefix}/repositories/acn-sbuad/apps-test/contents?path=App";

            Mock<IRepository> repositoryService = new Mock<IRepository>();
            repositoryService
                .Setup(r => r.GetContents(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns((List<FileSystemObject>)null);

            HttpClient client = GetTestClient(repositoryService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri)
            {
            };
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_RepoHasCreatedStatus_DeleteRepositoryIsNotCalled()
        {
            // Arrange
            string uri = $"/designerapi/Repository/CopyApp?org=ttd&sourceRepository=apps-test&targetRepository=cloned-app";

            Mock<IRepository> repositoryService = new Mock<IRepository>();
            repositoryService
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Repository { RepositoryCreatedStatus = HttpStatusCode.Created, CloneUrl = "https://www.vg.no" });

            HttpClient client = GetTestClient(repositoryService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            // Assert
            repositoryService.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_RepoHasConflict_DeleteRepositoryIsNotCalled()
        {
            // Arrange
            string uri = $"/designerapi/Repository/CopyApp?org=ttd&sourceRepository=apps-test&targetRepository=existing-repo";

            Mock<IRepository> repositoryService = new Mock<IRepository>();
            repositoryService
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Repository { RepositoryCreatedStatus = HttpStatusCode.Conflict });

            repositoryService
                 .Setup(r => r.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()));

            HttpClient client = GetTestClient(repositoryService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            // Assert
            repositoryService.Verify(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            repositoryService.Verify(r => r.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
            Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_GiteaTimeout_DeleteRepositoryIsCalled()
        {
            // Arrange
            string uri = $"/designerapi/Repository/CopyApp?org=ttd&sourceRepository=apps-test&targetRepository=cloned-app";

            Mock<IRepository> repositoryService = new Mock<IRepository>();
            repositoryService
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(new Repository { RepositoryCreatedStatus = HttpStatusCode.GatewayTimeout });

            repositoryService
                 .Setup(r => r.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()));

            HttpClient client = GetTestClient(repositoryService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            // Assert
            repositoryService.VerifyAll();
            Assert.Equal(HttpStatusCode.GatewayTimeout, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_ExceptionIsThrownByService_InternalServerError()
        {
            // Arrange
            string uri = $"/designerapi/Repository/CopyApp?org=ttd&sourceRepository=apps-test&targetRepository=cloned-app";

            Mock<IRepository> repositoryService = new Mock<IRepository>();
            repositoryService
                .Setup(r => r.CopyRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
               .Throws(new IOException());

            repositoryService
                 .Setup(r => r.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()));

            HttpClient client = GetTestClient(repositoryService.Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            // Assert
            repositoryService.VerifyAll();
            Assert.Equal(HttpStatusCode.InternalServerError, res.StatusCode);
        }

        [Fact]
        public async Task CopyApp_InvalidTargetRepoName_BadRequest()
        {
            // Arrange
            string uri = $"/designerapi/Repository/CopyApp?org=ttd&sourceRepository=apps-test&targetRepository=2022-cloned-app";

            HttpClient client = GetTestClient(new Mock<IRepository>().Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CreateApp_InvalidRepoName_BadRequest()
        {
            // Arrange
            string uri = $"/designerapi/Repository/CreateApp?org=ttd&repository=2021-application";

            HttpClient client = GetTestClient(new Mock<IRepository>().Object);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        private HttpClient GetTestClient(IRepository repositoryService)
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

                configuration.GetSection("ServiceRepositorySettings:RepositoryLocation").Value = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

                IConfigurationSection serviceRepositorySettingSection = configuration.GetSection("ServiceRepositorySettings");

                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(repositoryService);
                    services.Configure<ServiceRepositorySettings>(serviceRepositorySettingSection);
                    services.AddSingleton<IGitea, IGiteaMock>();
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            return client;
        }
    }
}
