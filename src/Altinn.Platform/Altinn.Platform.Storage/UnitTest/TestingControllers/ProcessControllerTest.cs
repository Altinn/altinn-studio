using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;

using Altinn.Common.PEP.Interfaces;

using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Fixture;
using Altinn.Platform.Storage.UnitTest.Mocks;
using Altinn.Platform.Storage.UnitTest.Mocks.Authentication;
using Altinn.Platform.Storage.UnitTest.Mocks.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;
using Altinn.Platform.Storage.Wrappers;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;

using Newtonsoft.Json;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingControllers
{
    /// <summary>
    /// Test class for Process Controller. Focuses on authorization of requests.
    /// </summary>
    public class ProcessControllerTest : IClassFixture<TestApplicationFactory<Startup>>
    {
        private readonly TestApplicationFactory<Startup> _factory;

        public ProcessControllerTest(TestApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test case: User has to low authentication level. 
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async void GetProcessHistory_UserHasToLowAuthLv_ReturnStatusForbidden()
        {
            // Arrange
            string requestUri = $"storage/api/v1/instances/1337/ba577e7f-3dfd-4ff6-b659-350308a47348/process/history";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 1);
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
        public async void GetProcessHistory_ReponseIsDeny_ReturnStatusForbidden()
        { // Arrange
            string requestUri = $"storage/api/v1/instances/1337/ba577e7f-3dfd-4ff6-b659-350308a47348/process/history";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(-1, 1);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: User is authorized. 
        /// Expected: Success status code. Empty process history is returned
        /// </summary>
        [Fact]
        public async void GetProcessHistory_UserIsAuthorized_ReturnsEmptyProcessHistoryReturnStatusForbidden()
        {
            // Arrange 
            string requestUri = $"storage/api/v1/instances/1337/17ad1851-f6cb-4573-bfcb-a17d145307b3/process/history";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 2);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);
            string responseString = await response.Content.ReadAsStringAsync();
            ProcessHistoryList processHistory = JsonConvert.DeserializeObject<ProcessHistoryList>(responseString);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Empty(processHistory.ProcessHistory);
        }

        /// <summary>
        /// Test case: User has to low authentication level. 
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async void PutProcess_UserHasToLowAuthLv_ReturnStatusForbidden()
        {
            // Arrange
            string requestUri = $"storage/api/v1/instances/1337/ae3fe2fa-1fcb-42b4-8e63-69a42d4e3502/process/";

            ProcessState state = new ProcessState();
            JsonContent jsonString = JsonContent.Create(state, new MediaTypeHeaderValue("application/json"));

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 1);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PutAsync(requestUri, jsonString);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: Response is deny. 
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async void PutProcess_PDPResponseIsDeny_ReturnStatusForbidden()
        {
            // Arrange
            string requestUri = $"storage/api/v1/instances/1337/ae3fe2fa-1fcb-42b4-8e63-69a42d4e3502/process/";

            ProcessState state = new ProcessState();
            JsonContent jsonString = JsonContent.Create(state, new MediaTypeHeaderValue("application/json"));

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(-1, 1);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PutAsync(requestUri, jsonString);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: User is Authorized
        /// Expected: Returns status ok. 
        /// </summary>
        [Fact]
        public async void PutProcess_UserIsAuthorized_ReturnStatusOK()
        {
            // Arrange 
            string requestUri = $"storage/api/v1/instances/1337/20a1353e-91cf-44d6-8ff7-f68993638ffe/process/";
            ProcessState state = new ProcessState();
            JsonContent jsonString = JsonContent.Create(state, new MediaTypeHeaderValue("application/json"));

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 3);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PutAsync(requestUri, jsonString);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        /// <summary>
        /// Test case: User is Authorized
        /// Expected: Returns status ok. 
        /// </summary>
        [Fact]
        public async void PutProcess_EndProcess_EnsureArchivedStateIsSet()
        {
            // Arrange
            string requestUri = $"storage/api/v1/instances/1337/377efa97-80ee-4cc6-8d48-09de12cc273d/process/";
            Instance testInstance = TestDataUtil.GetInstance(1337, new Guid("377efa97-80ee-4cc6-8d48-09de12cc273d"));
            testInstance.Id = $"{testInstance.InstanceOwner.PartyId}/{testInstance.Id}";
            ProcessState state = new ProcessState
            {
                Started = DateTime.Parse("2020-04-29T13:53:01.7020218Z"),
                StartEvent = "StartEvent_1",
                Ended = DateTime.UtcNow,
                EndEvent = "EndEvent_1"
            };

            JsonContent jsonString = JsonContent.Create(state, new MediaTypeHeaderValue("application/json"));

            Mock<IInstanceRepository> repositoryMock = new Mock<IInstanceRepository>();
            repositoryMock.Setup(ir => ir.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(testInstance);
            repositoryMock.Setup(ir => ir.Update(It.IsAny<Instance>())).ReturnsAsync((Instance i) => i);

            HttpClient client = GetTestClient(repositoryMock.Object);
            string token = PrincipalUtil.GetToken(3, 1337, 3);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PutAsync(requestUri, jsonString);
            string responseContent = await response.Content.ReadAsStringAsync();
            Instance actual = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));

            // Assert
            Assert.True(actual.Status.IsArchived);
        }

        private HttpClient GetTestClient(IInstanceRepository instanceRepository = null)
        {
            // No setup required for these services. They are not in use by the ApplicationController
            Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
            Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();
            Mock<IPartiesWithInstancesClient> partiesWrapper = new Mock<IPartiesWithInstancesClient>();

            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddMockRepositories();

                    services.AddSingleton(sasTokenProvider.Object);
                    services.AddSingleton(keyVaultWrapper.Object);
                    services.AddSingleton(partiesWrapper.Object);
                    services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();

                    if (instanceRepository != null)
                    {
                        services.AddSingleton(instanceRepository);
                    }
                    else
                    {
                        services.AddSingleton<IInstanceRepository, InstanceRepositoryMock>();
                    }
                });
            }).CreateClient();

            return client;
        }
    }
}
