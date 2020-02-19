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

namespace Altinn.Platform.Storage.UnitTest.TestingControllers
{
    public partial class IntegrationTests {

        public class InstanceEventsControllerTests : IClassFixture<WebApplicationFactory<Startup>>
        {
            private const string BasePath = "storage/api/v1/instances/1/cbdb00b1-4134-490d-b02b-3e33f7d8da33/events";

            private readonly Mock<IInstanceEventRepository> _instanceEventRepository;
            private readonly WebApplicationFactory<Startup> _factory;

            public InstanceEventsControllerTests(WebApplicationFactory<Startup> factory)
            {
                _factory = factory;
                _instanceEventRepository = new Mock<IInstanceEventRepository>();
            }

            /// <summary>
            /// Test case: User has to low authentication level. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Post_UserHasToLowAuthLv_ReturnStatusForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}";

                HttpClient client = GetTestClient(_instanceEventRepository.Object);
                string token = PrincipalUtil.GetToken(1, 0);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                Instance instance = new Instance();

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(JsonConvert.SerializeObject(instance), Encoding.UTF8, "application/json"));

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: Response is deny. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Post_ReponseIsDeny_ReturnStatusForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}";

                HttpClient client = GetTestClient(_instanceEventRepository.Object);
                string token = PrincipalUtil.GetToken(2);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                Instance instance = new Instance();

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
            public async void GetOne_UserHasToLowAuthLv_ReturnStatusForbidden()
            {
                // Arrange
                string eventGuid = "b10774ca-1872-4393-8856-4001859dab4a";
                string requestUri = $"{BasePath}/{eventGuid}";

                HttpClient client = GetTestClient(_instanceEventRepository.Object);
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
            public async void GetOne_ReponseIsDeny_ReturnStatusForbidden()
            {
                // Arrange
                string eventGuid = "b10774ca-1872-4393-8856-4001859dab4a";
                string requestUri = $"{BasePath}/{eventGuid}";

                HttpClient client = GetTestClient(_instanceEventRepository.Object);
                string token = PrincipalUtil.GetToken(2);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.GetAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: User has to low authentication level. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Get_UserHasToLowAuthLv_ReturnStatusForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}";

                HttpClient client = GetTestClient(_instanceEventRepository.Object);
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
            public async void Get_ReponseIsDeny_ReturnStatusForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}";

                HttpClient client = GetTestClient(_instanceEventRepository.Object);
                string token = PrincipalUtil.GetToken(2);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.GetAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Test case: User has to low authentication level. 
            /// Expected: Returns status forbidden.
            /// </summary>
            [Fact]
            public async void Delete_UserHasToLowAuthLv_ReturnStatusForbidden()
            {
                // Arrange
                int instanceOwnerPartyId = 1;
                string instanceGuid = "b10774ca-1872-4393-8856-4001859dab4a";
                string requestUri = $"{BasePath}?instanceOwnerPartyId={instanceOwnerPartyId}&instanceGuid={instanceGuid}";

                HttpClient client = GetTestClient(_instanceEventRepository.Object);
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
            public async void Delete_ReponseIsDeny_ReturnStatusForbidden()
            {
                // Arrange
                int instanceOwnerPartyId = 1;
                string instanceGuid = "b10774ca-1872-4393-8856-4001859dab4a";
                string requestUri = $"{BasePath}?instanceOwnerPartyId={instanceOwnerPartyId}&instanceGuid={instanceGuid}";

                HttpClient client = GetTestClient(_instanceEventRepository.Object);
                string token = PrincipalUtil.GetToken(2);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.DeleteAsync(requestUri);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            private HttpClient GetTestClient(IInstanceEventRepository instanceEventRepository)
            {
                // No setup required for these services. They are not in use by the InstanceEventController
                Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
                Mock<IDataRepository> dataRepository = new Mock<IDataRepository>();
                Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
                Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
                Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();

                HttpClient client = _factory.WithWebHostBuilder(builder =>
                {
                    builder.ConfigureTestServices(services =>
                    {
                        services.AddSingleton(applicationRepository.Object);
                        services.AddSingleton(dataRepository.Object);
                        services.AddSingleton(instanceEventRepository);
                        services.AddSingleton(instanceRepository.Object);
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
