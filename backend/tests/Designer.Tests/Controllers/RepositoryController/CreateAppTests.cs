using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
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
    public class CreateAppTests : DesignerEndpointsTestsBase<CreateAppTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly Mock<IRepository> _repositoryMock = new Mock<IRepository>();
        private static string VersionPrefix => "/designer/api/repos";
        public CreateAppTests(WebApplicationFactory<Program> factory) : base(factory)
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
        public async Task CreateApp_InvalidRepoName_BadRequest()
        {
            // Arrange
            string uri = $"{VersionPrefix}/create-app?org=ttd&repository=2021-application";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CreateApp_ValidRepoName_Created()
        {
            // Arrange
            string uri = $"{VersionPrefix}/create-app?org=ttd&repository=test";

            _repositoryMock
                .Setup(r => r.CreateService(It.IsAny<string>(), It.IsAny<ServiceConfiguration>()))
                .ReturnsAsync(new Repository() { RepositoryCreatedStatus = HttpStatusCode.Created, CloneUrl = "https://some.site/this/is/not/relevant" });

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }
    }
}
