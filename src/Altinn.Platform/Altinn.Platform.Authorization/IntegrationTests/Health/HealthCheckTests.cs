using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Platform.Authorization.Controllers;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests.Health
{
    /// <summary>
    /// Health check 
    /// </summary>
    public class HealthCheckTests : WebApplicationFactory<DecisionController>
    {
        private readonly WebApplicationFactory<DecisionController> _factory;

        /// <summary>
        /// Default constructor
        /// </summary>
        /// <param name="fixture">The web application fixture</param>
        public HealthCheckTests(WebApplicationFactory<DecisionController> fixture)
        {
            _factory = fixture;
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
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddScoped<IContextHandler, ContextHandlerMock>();
                    services.AddScoped<IPolicyRetrievalPoint, PolicyRetrievalPointMock>();
                    services.AddScoped<IDelegationMetadataRepository, DelegationMetadataRepositoryMock>();
                    services.AddScoped<IRoles, RolesMock>();
                    services.AddScoped<IPolicyRepository, PolicyRepositoryMock>();
                    services.AddScoped<IDelegationChangeEventQueue, DelegationChangeEventQueueMock>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            return client;
        }
    }
}
