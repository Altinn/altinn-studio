using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.App;
using Altinn.App.Core.Internal.AppModel;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;

using Xunit;

namespace App.IntegrationTestsRef.CommonTests.Health
{
    /// <summary>
    /// Health check 
    /// </summary>
    public class HealthCheckTests : IClassFixture<WebApplicationFactory<TestDummy>>
    {
        private readonly WebApplicationFactory<TestDummy> _factory;

        /// <summary>
        /// Default constructor
        /// </summary>
        /// <param name="factory">The web applicaiton factory</param>
        public HealthCheckTests(WebApplicationFactory<TestDummy> factory)
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