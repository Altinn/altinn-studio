using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetRepositoryTests : ResourceAdminControllerTestsBaseClass<GetRepositoryTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public GetRepositoryTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetResourceRepository_OK()
        {
            // Arrange
            string uri = $"{VersionPrefix}/ttd/resources";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceRepository_NoContent()
        {
            // Arrange
            string uri = $"{VersionPrefix}/orgwithoutrepo/resources";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }
    }
}
