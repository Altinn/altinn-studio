using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Authentication;

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.TestingControllers
{
    public class RepositoriesControllerTest : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/designer/api/v1";

        public RepositoriesControllerTest(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

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

            /*
            // Act
            HttpResponseMessage res = await client.GetAsync(uri);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);*/
        }
        
        public async Task Contents_ContentsIsNull_BadRequest()
        {
            // Arrange
            string uri = $"{_versionPrefix}/repositories/acn-sbuad/apps-test/contents?path=App";

            Mock<IRepository> repositoryService = new Mock<IRepository>();
            repositoryService
                .Setup(r => r.GetContents(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns((List<FileSystemObject>)null);

            HttpClient client = GetTestClient(repositoryService.Object);
        }

        private HttpClient GetTestClient(IRepository repositoryService)
        {
            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IRepository>(repositoryService);

                    services.AddAuthentication("Cookie")
                              .AddCookie(options =>
                              {
                                  options.Cookie.Name = Altinn.Studio.Designer.Constants.General.DesignerCookieName;
                              });
                });
            }).CreateClient();
            return client;
        }
    }
}
