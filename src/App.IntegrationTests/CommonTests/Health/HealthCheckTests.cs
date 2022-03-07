using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;

using Xunit;

namespace App.IntegrationTestsRef.CommonTests.Health
{
    /// <summary>
    /// Health check 
    /// </summary>
    public class HealthCheckTests : IClassFixture<WebApplicationFactory<Altinn.App.AppLogic.App>>
    {
        private readonly WebApplicationFactory<Altinn.App.AppLogic.App> _factory;

        /// <summary>
        /// Default constructor
        /// </summary>
        /// <param name="factory">The web applicaiton factory</param>
        public HealthCheckTests(WebApplicationFactory<Altinn.App.AppLogic.App> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Verify that component responds on health check
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task VerifyHealthCheck_OK()
        {
            HttpClient client = GetTestClient();

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/health");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
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