using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Platform.Authorization.Controllers;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.IntegrationTests.Webfactory;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("Our Test Collection #1")]
    public class PartiesControllerTest : IClassFixture<CustomWebApplicationFactory<DecisionController>>
    {
        private readonly CustomWebApplicationFactory<DecisionController> _factory;
        private readonly HttpClient _client;
  
        public PartiesControllerTest(CustomWebApplicationFactory<DecisionController> fixture)
        {
            _factory = fixture;
            _client = GetTestClient();
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("appliation/xml"));
        }

        /// <summary>
        /// Test case: Write a xml file to storage.
        /// Expected: WritePolicyAsync returns true and status code 200.
        /// </summary>
        [Fact]
        public async Task GetPartyList_TC01()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(21337, 4);
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await _client.GetAsync("authorization/api/v1/parties?userid=21338");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        private HttpClient GetTestClient()
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddScoped<IContextHandler, ContextHandlerMock>();
                    services.AddSingleton<IPolicyRetrievalPoint, PolicyRetrievalPointMock>();
                    services.AddSingleton<IDelegationMetadataRepository, DelegationMetadataRepositoryMock>();
                    services.AddSingleton<IRoles, RolesMock>();
                    services.AddSingleton<IPolicyRepository, PolicyRepositoryMock>();
                    services.AddSingleton<IDelegationChangeEventQueue, DelegationChangeEventQueueMock>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            return client;
        }
    }
}
