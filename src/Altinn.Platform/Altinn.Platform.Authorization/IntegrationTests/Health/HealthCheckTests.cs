using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Authorization.IntegrationTests.Fixtures;

using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests.Health
{
    /// <summary>
    /// Health check 
    /// </summary>
    public class HealthCheckTests :IClassFixture<PlatformAuthorizationFixture>
    {
        private readonly PlatformAuthorizationFixture _fixture;

        /// <summary>
        /// Default constructor
        /// </summary>
        /// <param name="fixture">The web application fixture</param>
        public HealthCheckTests(PlatformAuthorizationFixture fixture)
        {
            _fixture = fixture;
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
            string content = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private HttpClient GetTestClient()
        {
            return _fixture.GetClient();
        }
    }
}
