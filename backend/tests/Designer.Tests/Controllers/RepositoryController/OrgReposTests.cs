using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class OrgReposTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.RepositoryController, OrgReposTests>
    {
        private static string VersionPrefix => "/designer/api/repos";
        public OrgReposTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.RepositoryController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task OrgRepos_Returns200()
        {
            // Arrange
            string uri = $"{VersionPrefix}/org/ttd";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
