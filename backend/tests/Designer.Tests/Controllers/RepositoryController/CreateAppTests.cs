using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class CreateAppTests : RepositoryControllerTestsBase<CreateAppTests>
    {

        public CreateAppTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.RepositoryController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task CreateApp_InvalidRepoName_BadRequest()
        {
            // Arrange
            string uri = $"{VersionPrefix}/create-app?org=ttd&repository=2021-application";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

        [Fact]
        public async Task CreateApp_ValidRepoName_Created()
        {
            // Arrange
            string uri = $"{VersionPrefix}/create-app?org=ttd&repository=test";

            RepositoryMock
                .Setup(r => r.CreateService(It.IsAny<string>(), It.IsAny<ServiceConfiguration>()))
                .ReturnsAsync(new Repository() { RepositoryCreatedStatus = HttpStatusCode.Created, CloneUrl = "https://some.site/this/is/not/relevant" });

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }
    }
}
