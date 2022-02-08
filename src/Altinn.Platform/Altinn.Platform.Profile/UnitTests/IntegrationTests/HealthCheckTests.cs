using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Health;
using Altinn.Platform.Profile.Tests.IntegrationTests.Utils;

using Microsoft.AspNetCore.Mvc.Testing;

using Xunit;

namespace Altinn.Platform.Profile.Tests.IntegrationTests
{
    public class HealthCheckTests : IClassFixture<WebApplicationFactory<HealthCheck>>
    {
        private readonly WebApplicationFactorySetup<HealthCheck> _webApplicationFactorySetup;

        public HealthCheckTests(WebApplicationFactory<HealthCheck> factory)
        {
            _webApplicationFactorySetup = new WebApplicationFactorySetup<HealthCheck>(factory);
        }

        [Fact]
        public async Task GetHealth_ReturnsOk()
        {
            // Arrange
            HttpClient client = _webApplicationFactorySetup.GetTestServerClient();

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/health");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
