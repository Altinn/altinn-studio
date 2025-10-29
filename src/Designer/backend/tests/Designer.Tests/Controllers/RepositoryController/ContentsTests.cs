#nullable disable
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class ContentsTests : DesignerEndpointsTestsBase<ContentsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly Mock<IRepository> _repositoryMock = new Mock<IRepository>();
        private static string VersionPrefix => "/designer/api/repos";
        public ContentsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddSingleton(_ => _repositoryMock.Object);
        }

        [Fact]
        public async Task Contents_ContentsReturned_OK()
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/ttd/apps-test/contents";

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

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Contents_ContentsIsNull_BadRequest()
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/acn-sbuad/apps-test/contents?path=App";

            _repositoryMock
                .Setup(r => r.GetContents(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns((List<FileSystemObject>)null);

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

    }
}
