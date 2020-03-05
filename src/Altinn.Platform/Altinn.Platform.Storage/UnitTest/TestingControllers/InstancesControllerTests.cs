using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;

using Altinn.Common.PEP.Interfaces;

using Altinn.Platform.Storage.UnitTest.Mocks;
using Altinn.Platform.Storage.UnitTest.Mocks.Authentication;
using Altinn.Platform.Storage.UnitTest.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Wrappers;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;
using Newtonsoft.Json;
using Xunit;
using System.IO;

namespace Altinn.Platform.Storage.UnitTest.TestingControllers
{
    public partial class IntegrationTests
    {

        public class InstancesControllerTests : IClassFixture<WebApplicationFactory<Startup>>
        {
            private const string BasePath = "storage/api/v1/instances";

            private readonly WebApplicationFactory<Startup> _factory;
            private readonly Mock<IInstanceRepository> _instanceRepository;

            /// <summary>
            /// Constructor.
            /// </summary>
            /// <param name="factory">The web application factory.</param>
            public InstancesControllerTests(WebApplicationFactory<Startup> factory)
            {
                _factory = factory;
                _instanceRepository = new Mock<IInstanceRepository>();
            }

            /// <summary>
            /// Test case: User has to low authentication level. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Get_UserHasTooLowAuthLv_ReturnsStatusForbidden()
            {
                // Arrange
                int instanceOwnerPartyId = 1;
                string instanceGuid = "cbdb00b1-4134-490d-b02b-3e33f7d8da33";
                string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetToken(1, 0);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.GetAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: Response is deny. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Get_ReponseIsDeny_ReturnsStatusForbidden()
            {
                // Arrange
                int instanceOwnerPartyId = 1;
                string instanceGuid = "cbdb00b1-4134-490d-b02b-3e33f7d8da33";
                string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetToken(-1);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.GetAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: Response is deny. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Post_ReponseIsDeny_ReturnsStatusForbidden()
            {
                // Arrange
                string appId = "test/testApp1";
                string requestUri = $"{BasePath}?appId={appId}";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetToken(-1);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Laste opp test instance.. 
                Instance instance = new Instance() { InstanceOwner = new InstanceOwner() { PartyId = "1" }, Org = "test", AppId = "test/testApp1" };

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(JsonConvert.SerializeObject(instance), Encoding.UTF8, "application/json"));

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: User has to low authentication level. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Post_UserHasTooLowAuthLv_ReturnsStatusForbidden()
            {
                // Arrange
                string appId = "test/testApp1";
                string requestUri = $"{BasePath}?appId={appId}";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetToken(1, 0);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Laste opp test instance.. 
                Instance instance = new Instance() { InstanceOwner = new InstanceOwner() { PartyId = "1" }, Org = "test", AppId = "test/testApp1" };

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(JsonConvert.SerializeObject(instance), Encoding.UTF8, "application/json"));

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: User has to low authentication level. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Delete_UserHasTooLowAuthLv_ReturnsStatusForbidden()
            {
                // Arrange
                string org = "tdd";
                string app = "test-applikasjon-1";
                int instanceOwnerId = 1000;
                string instanceGuid = "1916cd18-3b8e-46f8-aeaf-4bc3397ddd08";
                string json = File.ReadAllText($"data/instances/{org}/{app}/{instanceOwnerId}/{instanceGuid}.json");
                Instance instance = JsonConvert.DeserializeObject<Instance>(json);
                _instanceRepository.Setup(r => r.GetOne(It.IsAny<string>(), It.IsAny<int>()))
                .ReturnsAsync(instance);

                string requestUri = $"{BasePath}/{instanceOwnerId}/{instanceGuid}";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetToken(1, 0);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.DeleteAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: Response is deny. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Delete_ReponseIsDeny_ReturnsStatusForbidden()
            {
                // Arrange
                string org = "tdd";
                string app = "test-applikasjon-1";
                int instanceOwnerId = 1000;
                string instanceGuid = "1916cd18-3b8e-46f8-aeaf-4bc3397ddd08";
                string json = File.ReadAllText($"data/instances/{org}/{app}/{instanceOwnerId}/{instanceGuid}.json");
                Instance instance = JsonConvert.DeserializeObject<Instance>(json);
                _instanceRepository.Setup(r => r.GetOne(It.IsAny<string>(), It.IsAny<int>()))
                    .ReturnsAsync(instance);

                string requestUri = $"{BasePath}/{instanceOwnerId}/{instanceGuid}";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetToken(-1);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.DeleteAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: Get Multiple instances without specifying org.
            /// Expected: Returns status bad request.
            /// </summary>
            [Fact]
            public async void GetMany_NoOrgDefined_ReturnsBadRequest()
            {
                // Arrange
                string requestUri = $"{BasePath}";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetOrgToken("testOrg", scope: "altinn:instances.read");
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.GetAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            }

            /// <summary>
            /// Test case: Get Multiple instances using client with incorrect scope.
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void GetMany_IncorrectScope_ReturnsForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}?org=testOrg";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetOrgToken("testOrg", scope: "altinn:instances.write");
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.GetAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: Response is deny. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void GetMany_QueryingDifferentOrgThanInClaims_ReturnsForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}?org=paradiseHotelOrg";

                HttpClient client = GetTestClient(_instanceRepository.Object);
                string token = PrincipalUtil.GetOrgToken("testOrg", scope: "altinn:instances.read");
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.GetAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            private HttpClient GetTestClient(IInstanceRepository instanceRepository)
            {
                Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
                Application testApp1 = new Application() { Id = "test/testApp1", Org = "test" };

                applicationRepository.Setup(s => s.FindOne(It.Is<string>(p => p.Equals("test/testApp1")), It.IsAny<string>())).ReturnsAsync(testApp1);

                // No setup required for these services. They are not in use by the ApplicationController
                Mock<IDataRepository> dataRepository = new Mock<IDataRepository>();
                Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
                Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
                Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();

                HttpClient client = _factory.WithWebHostBuilder(builder =>
                {
                    builder.ConfigureTestServices(services =>
                    {
                        services.AddSingleton(applicationRepository.Object);
                        services.AddSingleton(dataRepository.Object);
                        services.AddSingleton(instanceEventRepository.Object);
                        services.AddSingleton(instanceRepository);
                        services.AddSingleton(sasTokenProvider.Object);
                        services.AddSingleton(keyVaultWrapper.Object);
                        services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                        services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    });
                }).CreateClient();

                return client;
            }
        }
    }
}
