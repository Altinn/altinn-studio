using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

using Altinn.Platform.Storage.UnitTest.Fixture;
using Altinn.Platform.Storage.UnitTest.Mocks.Repository;
using Microsoft.AspNetCore.TestHost;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.Health
{
    public class HealthCheckTests : IClassFixture<TestApplicationFactory<Startup>>
    {
        private readonly TestApplicationFactory<Startup> _factory;

        public HealthCheckTests(TestApplicationFactory<Startup> factory)
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
            string content = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private HttpClient GetTestClient()
        {
            Program.ConfigureSetupLogging();
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
