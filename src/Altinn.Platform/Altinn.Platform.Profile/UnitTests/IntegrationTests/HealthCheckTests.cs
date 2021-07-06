using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Tests.IntegrationTests.Utils;
using Altinn.Platform.Profile.Tests.Mocks;

using Microsoft.AspNetCore.Mvc.Testing;

using Xunit;

namespace Altinn.Platform.Profile.Tests.IntegrationTests
{
    public class HealthCheckTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;

        public HealthCheckTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetHealth_ReturnsOk()
        {
            // Arrange
            HttpClient client = _factory.CreateHttpClient(new DelegatingHandlerStub());

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/health");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
