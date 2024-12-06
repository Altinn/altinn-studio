using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class OrgReposTests : DesignerEndpointsTestsBase<OrgReposTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix => "/designer/api/repos";
        public OrgReposTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task OrgRepos_Returns200()
        {
            // Arrange
            string uri = $"{VersionPrefix}/org/ttd";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
