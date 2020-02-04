using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.IntegrationTest.Mocks;
using Altinn.Platform.Storage.IntegrationTest.Mocks.Authentication;
using Altinn.Platform.Storage.IntegrationTest.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Xunit;

#pragma warning disable 1591
#pragma warning disable SA1600

namespace Altinn.Platform.Storage.IntegrationTest.TestingControllers
{
    /// <summary>
    /// Test class for Process Controller. Focuses on authorization of requests.
    /// </summary>
    public class ProcessControllerTest : IClassFixture<WebApplicationFactory<Startup>>
    {
        private const string BasePath = "storage/api/v1/instances/";
        private const string InstanceId = "1/AD0FD591-6C4D-47DE-8CCE-20AED6E9E8AE";

        private readonly Mock<IInstanceEventRepository> _repositoryMock;
        private readonly WebApplicationFactory<Startup> _factory;

        public ProcessControllerTest(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
            _repositoryMock = new Mock<IInstanceEventRepository>();
        }

        /// <summary>
        /// Test case: User has to low authentication level. 
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async void GetProcessHistory_UserHasToLowAuthLv_ReturnStatusForbidden()
        {
            // Arrange
            string requestUri = $"{BasePath}{InstanceId}/process/history";
            _repositoryMock.Setup(r => r.ListInstanceEvents(It.IsAny<string>(), It.IsAny<string[]>(), null, null)).ReturnsAsync(new List<InstanceEvent>());

            HttpClient client = GetTestClient(_repositoryMock.Object);
            string token = PrincipalUtil.GetToken(1, 1);
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
            string requestUri = $"{BasePath}{InstanceId}/process/history";

            HttpClient client = GetTestClient(_repositoryMock.Object);
            string token = PrincipalUtil.GetToken(2);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: User is authorized. 
        /// Expected: Sucess status code. Empty process history is returned
        /// </summary>
        [Fact]
        public async void GetProcessHistory_UserIsAuthorized_ReturnsEmptyProcessHistoryReturnStatusForbidden()
        {
            // Arrange
            string requestUri = $"{BasePath}{InstanceId}/process/history";
            _repositoryMock.Setup(r => r.ListInstanceEvents(It.IsAny<string>(), It.IsAny<string[]>(), null, null)).ReturnsAsync(new List<InstanceEvent>());

            HttpClient client = GetTestClient(_repositoryMock.Object);
            string token = PrincipalUtil.GetToken(1, 2);
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
            string requestUri = $"{BasePath}{InstanceId}/process";
            ProcessState state = new ProcessState();
            StringContent jsonString = new StringContent(JsonConvert.SerializeObject(state), Encoding.UTF8, "application/json");

            HttpClient client = GetTestClient(_repositoryMock.Object);
            string token = PrincipalUtil.GetToken(1, 1);
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
            string requestUri = $"{BasePath}{InstanceId}/process";
            ProcessState state = new ProcessState();
            StringContent jsonString = new StringContent(JsonConvert.SerializeObject(state), Encoding.UTF8, "application/json");

            HttpClient client = GetTestClient(_repositoryMock.Object);
            string token = PrincipalUtil.GetToken(2);
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
            string requestUri = $"{BasePath}{InstanceId}/process";
            ProcessState state = new ProcessState();
            StringContent jsonString = new StringContent(JsonConvert.SerializeObject(state), Encoding.UTF8, "application/json");

            HttpClient client = GetTestClient(_repositoryMock.Object);
            string token = PrincipalUtil.GetToken(1);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PutAsync(requestUri, jsonString);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private HttpClient GetTestClient(IInstanceEventRepository instanceEventRepository)
        {
            // No setup required for these services. They are not in use by the ApplicationController
            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            Mock<IDataRepository> dataRepository = new Mock<IDataRepository>();
            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();

            instanceRepository.Setup(r => r.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(
                new Instance
                {
                    Id = InstanceId,
                    Org = "ttd",
                    AppId = "ttd/testapp",
                    Process = new ProcessState
                    {
                        StartEvent = "StartEvent_1",
                        Started = DateTime.UtcNow.AddDays(-1),
                        CurrentTask = new ProcessElementInfo
                        {
                            Flow = 2,
                            ElementId = "Task_1",
                            AltinnTaskType = "data",
                            Name = "Utfylling",
                            Started = DateTime.UtcNow
                        }
                    }
                });
            instanceRepository.Setup(r => r.Update(It.IsAny<Instance>())).ReturnsAsync((Instance i) => { return i; });

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(applicationRepository.Object);
                    services.AddSingleton(dataRepository.Object);
                    services.AddSingleton(instanceEventRepository);
                    services.AddSingleton(instanceRepository.Object);
                    services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
            }).CreateClient();

            return client;
        }
    }
}
