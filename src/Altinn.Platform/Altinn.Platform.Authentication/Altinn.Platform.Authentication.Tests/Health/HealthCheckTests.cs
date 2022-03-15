using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Health;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Xunit;

namespace Altinn.Platform.Authentication.UnitTest
{
    /// <summary>
    /// Health check 
    /// </summary>
    public class HealthCheckTests : IClassFixture<WebApplicationFactory<HealthCheck>>
    {
        private readonly WebApplicationFactory<HealthCheck> _factory;

        /// <summary>
        /// Default constructor
        /// </summary>
        /// <param name="factory">The web applicaiton factory</param>
        public HealthCheckTests(WebApplicationFactory<HealthCheck> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Verify that component responds on health check
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task VerifyHeltCheck_OK()
        {
            HttpClient client = GetTestClient();

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/health")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private HttpClient GetTestClient()
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                });
            }).CreateClient();

            return client;
        }
    }
}
