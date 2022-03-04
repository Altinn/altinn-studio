using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Health;
using Altinn.Platform.Storage.UnitTest.Fixture;
using Altinn.Platform.Storage.UnitTest.Mocks.Repository;
using Microsoft.AspNetCore.TestHost;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.Health
{
    public class HealthCheckTests : IClassFixture<TestApplicationFactory<HealthCheck>>
    {
        private readonly TestApplicationFactory<HealthCheck> _factory;

        public HealthCheckTests(TestApplicationFactory<HealthCheck> factory)
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
