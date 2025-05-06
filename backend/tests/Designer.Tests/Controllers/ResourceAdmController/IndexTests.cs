using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdmController
{
    public class IndexTests
        : DesignerEndpointsTestsBase<IndexTests>,
            IClassFixture<WebApplicationFactory<Program>>
    {
        public IndexTests(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetResourceAdmIndexOK()
        {
            // Arrange
            string uri = $"/resourceadm/ttd/resources";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Get,
                uri
            );
            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
            string contenthtml = await res.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Contains("resourceadm.js", contenthtml);
        }
    }
}
