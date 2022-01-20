using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Tests.IntegrationTests.Utils;
using Altinn.Platform.Profile.Tests.Mocks;

using Microsoft.AspNetCore.Mvc.Testing;

using Xunit;

namespace Altinn.Platform.Profile.Tests.IntegrationTests
{
    public class OpenApiSpecificationTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactorySetup _webApplicationFactorySetup;

        public OpenApiSpecificationTests(WebApplicationFactory<Startup> factory)
        {
            _webApplicationFactorySetup = new WebApplicationFactorySetup(factory);
        }

        [Fact]
        public async Task GetOpenApiSpecification_ReturnsOk()
        {
            // Arrange
            HttpClient client = _webApplicationFactorySetup.GetTestServerClient();

            HttpRequestMessage httpRequestMessage = new (HttpMethod.Get, "/profile/swagger/v1/swagger.json");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
