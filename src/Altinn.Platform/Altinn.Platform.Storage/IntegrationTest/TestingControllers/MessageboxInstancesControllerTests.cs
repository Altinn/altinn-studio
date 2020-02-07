using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.IntegrationTest.Mocks;
using Altinn.Platform.Storage.IntegrationTest.Mocks.Authentication;
using Altinn.Platform.Storage.IntegrationTest.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest.TestingControllers
{
    /// <summary>
    /// Represents a collection of integration tests of the <see cref="MessageBoxInstancesController"/>.
    /// </summary>
    [Collection("Sequential")]
    public class MessageboxInstancesControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private const string BasePath = "/storage/api/v1";

        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _validToken;

        /// <summary>
        /// Initializes a new instance of the <see cref="MessageboxInstancesControllerTests"/> class with the given <see cref="WebApplicationFactory{TStartup}"/>.
        /// </summary>
        /// <param name="factory">The <see cref="WebApplicationFactory{TStartup}"/> to use when setting up the test server.</param>
        public MessageboxInstancesControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
            _validToken = PrincipalUtil.GetToken(1);
        }

        /// <summary>
        /// Scenario:
        ///   Request list of instances active without language settings.
        /// Expected result:
        ///   Requested language is not available, but a list of instances is returned regardless.
        /// Success criteria:
        ///   Default language is used for title, and the title contains the word "bokmål".
        /// </summary>
        [Fact]
        public async void GetMessageBoxInstanceList_RequestAllInstancesForAnOwnerWithtoutLanguage_ReturnsAllElementsUsingDefaultLanguage()
        {
            // Arrange
            TestData testData = new TestData();
            List<Instance> testInstances = testData.GetInstances_App3();
            
            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetInstancesInStateOfInstanceOwner(It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(testInstances);
            
            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.GetAppTitles(It.IsAny<List<string>>())).ReturnsAsync(TestData.AppTitles_Dict_App3);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage response = await client.GetAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}?state=active");

            // Assert
            string content = await response.Content.ReadAsStringAsync();
            List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject(content, typeof(List<MessageBoxInstance>)) as List<MessageBoxInstance>;

            int expectedCount = 2;
            string expectedTitle = "Test applikasjon 3 bokmål";
            int actualCount = messageBoxInstances.Count;
            string actualTitle = messageBoxInstances.First().Title;
            Assert.Equal(expectedCount, actualCount);
            Assert.Equal(expectedTitle, actualTitle);
        }

        /// <summary>
        /// Scenario:
        ///   Request list of instances with language setting english.
        /// Expected:
        ///   Requested language is available and a list of instances is returned.
        /// Success:
        ///   English title is returned in the instances and the title contains the word "english".
        /// </summary>
        [Fact]
        public async void GetMessageBoxInstanceList_RequestAllInstancesForAnOwnerInEnglish_ReturnsAllElementsWithEnglishTitles()
        {
            // Arrange
            TestData testData = new TestData();
            List<Instance> testInstances = testData.GetInstances_App2();
            
            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetInstancesInStateOfInstanceOwner(It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(testInstances);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.GetAppTitles(It.IsAny<List<string>>())).ReturnsAsync(TestData.AppTitles_Dict_App2);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage response = await client.GetAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}?state=active&language=en");
            string content = await response.Content.ReadAsStringAsync();
            List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(content);

            int actualCount = messageBoxInstances.Count;
            string actualTitle = messageBoxInstances.First().Title;

            // Assert
            int expectedCount = 2;
            string expectedTitle = "Test application 2 english";
            Assert.Equal(expectedCount, actualCount);
            Assert.Equal(expectedTitle, actualTitle);
        }

        /// <summary>
        /// Scenario:
        ///   Request list of archived instances.
        /// Expected:
        ///   A list of instances is returned regardless.
        /// Success:
        ///   A single instance is returned.
        /// </summary>
        [Fact]
        public async void GetMessageBoxInstanceList_RequestArchivedInstancesForGivenOwner_ReturnsCorrectListOfInstances()
        {
            // Arrange
            TestData testData = new TestData();
            List<Instance> testInstances = testData.GetInstances_App1();
            
            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetInstancesInStateOfInstanceOwner(It.IsAny<int>(), It.Is<string>(p2 => p2 == "archived")))
                .ReturnsAsync(testInstances);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.GetAppTitles(It.IsAny<List<string>>())).ReturnsAsync(TestData.AppTitles_Dict_App1);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage responseMessage = await client.GetAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}?state=archived");

            // Assert
            Assert.Equal(HttpStatusCode.OK, responseMessage.StatusCode);

            string responseContent = await responseMessage.Content.ReadAsStringAsync();
            List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(responseContent);

            int actualCount = messageBoxInstances.Count;
            int expectedCount = 3;
            Assert.Equal(expectedCount, actualCount);
        }

        /// <summary>
        /// Scenario:
        ///   Request list of archived instances where task of the instance is not set. 
        /// Expected:
        ///   A list of instances is returned regardless.
        /// Success:
        ///   A single instance is returned and the task has the value of end event. 
        /// </summary>
        [Fact]
        public async void GetMessageBoxInstanceList_RequestArchivedInstancesForGivenOwner_ReturnsCorrectListOfInstancesWithEndEventTask()
        {
            // Arrange
            TestData testData = new TestData();
            List<Instance> testInstances = testData.GetInstances_App4();

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetInstancesInStateOfInstanceOwner(It.IsAny<int>(), It.Is<string>(p2 => p2 == "archived")))
                .ReturnsAsync(testInstances);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.GetAppTitles(It.IsAny<List<string>>())).ReturnsAsync(TestData.AppTitles_Dict_App1);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage responseMessage = await client.GetAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}?state=archived");

            // Assert
            instanceRepository.VerifyAll();

            Assert.Equal(HttpStatusCode.OK, responseMessage.StatusCode);

            string responseContent = await responseMessage.Content.ReadAsStringAsync();
            List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(responseContent);

            int actualCount = messageBoxInstances.Count;
            int expectedCount = 1;
            Assert.Equal(expectedCount, actualCount);
        }

        /// <summary>
        /// Scenario:
        ///   Restore a soft deleted instance in storage.
        /// Expected result:
        ///   The instance is restored.
        /// Success criteria:
        ///   True is returned for the http request. 
        /// </summary>
        [Fact]
        public async void Undelete_RestoreSoftDeletedInstance_ReturnsTrue()
        {
            // Arrange
            TestData testData = new TestData();
            Instance instance = testData.GetSoftDeletedInstance();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(instance);
            instanceRepository.Setup(s => s.Update(It.IsAny<Instance>())).ReturnsAsync((Instance i) => i);

            InstanceEvent instanceEvent = null;

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
            instanceEventRepository.Setup(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>())).Callback<InstanceEvent>(p => instanceEvent = p)
                .ReturnsAsync((InstanceEvent r) => r);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instance.Id.Split("/")[1]}/undelete", null);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            Assert.NotNull(instanceEvent);
            Assert.Equal("Undeleted", instanceEvent.EventType);

            string content = await response.Content.ReadAsStringAsync();
            bool actualResult = JsonConvert.DeserializeObject<bool>(content);

            Assert.True(actualResult);
        }

        /// <summary>
        /// Scenario:
        ///   Restore a soft deleted instance in storage but user has too low authentication level. 
        /// Expected result:
        ///   The instance is not restored and returns status forbidden. 
        /// </summary>
        [Fact]
        public async void Undelete_UserHasTooLowAuthLv_ReturnsStatusForbidden()
        {
            // Arrange
            TestData testData = new TestData();
            Instance instance = testData.GetSoftDeletedInstance();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(instance);
            instanceRepository.Setup(s => s.Update(It.IsAny<Instance>())).ReturnsAsync((Instance i) => i);

            InstanceEvent instanceEvent = null;

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
            instanceEventRepository.Setup(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>())).Callback<InstanceEvent>(p => instanceEvent = p)
                .ReturnsAsync((InstanceEvent r) => r);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            string token = PrincipalUtil.GetToken(1, 0);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instance.Id.Split("/")[1]}/undelete", null);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = await response.Content.ReadAsStringAsync();
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Scenario:
        ///   Restore a soft deleted instance in storage but response is deny.  
        /// Expected result:
        ///   The instance is not restored and returns status forbidden. 
        /// </summary>
        [Fact]
        public async void Undelete_ResponseIsDeny_ReturnsStatusForbidden()
        {
            // Arrange
            TestData testData = new TestData();
            Instance instance = testData.GetSoftDeletedInstance();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(instance);
            instanceRepository.Setup(s => s.Update(It.IsAny<Instance>())).ReturnsAsync((Instance i) => i);

            InstanceEvent instanceEvent = null;

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
            instanceEventRepository.Setup(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>())).Callback<InstanceEvent>(p => instanceEvent = p)
                .ReturnsAsync((InstanceEvent r) => r);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            string token = PrincipalUtil.GetToken(2);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instance.Id.Split("/")[1]}/undelete", null);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = await response.Content.ReadAsStringAsync();
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Scenario:
        ///   Restore a hard deleted instance in storage
        /// Expected result:
        ///   It should not be possible to restore a hard deleted instance
        /// Success criteria:
        ///   Response status is BadRequest and the body contains correct reason.
        /// </summary>
        [Fact]
        public async void Undelete_AttemptToRestoreHardDeletedInstance_ReturnsBadRequest()
        {
            // Arrange
            TestData testData = new TestData();
            Instance instance = testData.GetHardDeletedInstance();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(instance);

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instance.Id.Split("/")[1]}/undelete", null);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();

            string expectedMsg = "Instance was permanently deleted and cannot be restored.";
            Assert.Equal(expectedMsg, content);
        }

        /// <summary>
        /// Scenario:
        ///   Non-existent instance to be restored
        /// Expected result:
        ///   Error code is returned from the controller
        /// Success criteria:
        ///   Not found error code is returned.
        /// </summary>
        [Fact]
        public async void Undelete_RestoreNonExistentInstance_ReturnsNotFound()
        {
            // Arrange
            TestData testData = new TestData();
            string instanceGuid = Guid.NewGuid().ToString();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();

            DocumentClientException dex = CreateDocumentClientExceptionForTesting("Not found", HttpStatusCode.NotFound);
            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ThrowsAsync(dex);

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instanceGuid}/undelete", null);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

            string content = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            string expectedMsg = $"Didn't find the object that should be restored with instanceId={testData.GetInstanceOwnerPartyId()}/{instanceGuid}";

            Assert.Equal(expectedMsg, content);
        }

        /// <summary>
        /// Scenario:
        ///   Soft delete an active instance in storage.
        /// Expected result:
        ///   Instance is marked for soft delete.
        /// Success criteria:
        ///   True is returned for the http request.
        /// </summary>
        [Fact]
        public async void Delete_SoftDeleteActiveInstance_InstanceIsMarked_EventIsCreated_ReturnsTrue()
        {
            // Arrange
            TestData testData = new TestData();
            Instance instance = testData.GetActiveInstance();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            
            Instance storedInstance = null;

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(instance);
            instanceRepository.Setup(s => s.Update(It.IsAny<Instance>())).Callback<Instance>(p => storedInstance = p).ReturnsAsync((Instance i) => i);

            InstanceEvent instanceEvent = null;

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
            instanceEventRepository.Setup(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>())).Callback<InstanceEvent>(p => instanceEvent = p)
                .ReturnsAsync((InstanceEvent r) => r);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instance.Id.Split("/")[1]}?hard=false");  

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();
            bool actualResult = JsonConvert.DeserializeObject<bool>(content);
            Assert.True(actualResult);

            Assert.True(storedInstance.Status.SoftDeleted.HasValue);
            Assert.False(storedInstance.Status.HardDeleted.HasValue);

            Assert.NotNull(instanceEvent);
            Assert.Equal("Deleted", instanceEvent.EventType);
        }

        /// <summary>
        /// Scenario:
        ///   Soft delete an active instance in storage but user has too low authentication level.
        /// Expected result:
        ///   Returns status forbidden. 
        /// </summary>
        [Fact]
        public async void Delete_UserHasTooLowAuthLv_ReturnsStatusForbidden()
        {
            // Arrange
            TestData testData = new TestData();
            Instance instance = testData.GetActiveInstance();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();

            Instance storedInstance = null;

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(instance);
            instanceRepository.Setup(s => s.Update(It.IsAny<Instance>())).Callback<Instance>(p => storedInstance = p).ReturnsAsync((Instance i) => i);

            InstanceEvent instanceEvent = null;

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
            instanceEventRepository.Setup(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>())).Callback<InstanceEvent>(p => instanceEvent = p)
                .ReturnsAsync((InstanceEvent r) => r);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            string token = PrincipalUtil.GetToken(1, 0);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instance.Id.Split("/")[1]}?hard=false");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = await response.Content.ReadAsStringAsync();
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Scenario:
        ///   Soft delete an active instance in storage but reponse is deny.
        /// Expected result:
        ///   Returns status forbidden. 
        /// </summary>
        [Fact]
        public async void Delete_ResponseIsDeny_ReturnsStatusForbidden()
        {
            // Arrange
            TestData testData = new TestData();
            Instance instance = testData.GetActiveInstance();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();

            Instance storedInstance = null;

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(instance);
            instanceRepository.Setup(s => s.Update(It.IsAny<Instance>())).Callback<Instance>(p => storedInstance = p).ReturnsAsync((Instance i) => i);

            InstanceEvent instanceEvent = null;

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
            instanceEventRepository.Setup(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>())).Callback<InstanceEvent>(p => instanceEvent = p)
                .ReturnsAsync((InstanceEvent r) => r);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            string token = PrincipalUtil.GetToken(2);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instance.Id.Split("/")[1]}?hard=false");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = await response.Content.ReadAsStringAsync();
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Scenario:
        ///   Hard delete a soft deleted instance in storage.
        /// Expected result:
        ///   Instance is marked for hard delete.
        /// Success criteria:
        ///   True is returned for the http request.
        /// </summary>
        [Fact]
        public async void DeleteInstance_TC02()
        {
            // Arrange
            TestData testData = new TestData();
            Instance instance = testData.GetSoftDeletedInstance();

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            
            Instance storedInstance = null;

            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            instanceRepository.Setup(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(instance);
            instanceRepository.Setup(s => s.Update(It.IsAny<Instance>())).Callback<Instance>(p => storedInstance = p).ReturnsAsync((Instance i) => i);

            InstanceEvent instanceEvent = null;

            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
            instanceEventRepository.Setup(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>())).Callback<InstanceEvent>(p => instanceEvent = p)
                .ReturnsAsync((InstanceEvent r) => r);

            HttpClient client = GetTestClient(instanceRepository.Object, applicationRepository.Object, instanceEventRepository.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/{testData.GetInstanceOwnerPartyId()}/{instance.Id.Split("/")[1]}?hard=true");

            // Assert
            HttpStatusCode actualStatusCode = response.StatusCode;
            string content = await response.Content.ReadAsStringAsync();
            bool actualResult = JsonConvert.DeserializeObject<bool>(content);

            HttpStatusCode expectedStatusCode = HttpStatusCode.OK;
            bool expectedResult = true;
            Assert.Equal(expectedResult, actualResult);
            Assert.Equal(expectedStatusCode, actualStatusCode);
            Assert.True(storedInstance.Status.HardDeleted.HasValue);
        }

        private HttpClient GetTestClient(
            IInstanceRepository instanceRepository,
            IApplicationRepository applicationRepository,
            IInstanceEventRepository instanceEventRepository)
        {
            // No setup required for these services. They are not in use by the MessageBoxInstancesController
            Mock<IDataRepository> dataRepository = new Mock<IDataRepository>();

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(dataRepository.Object);
                    services.AddSingleton(instanceRepository);
                    services.AddSingleton(applicationRepository);
                    services.AddSingleton(instanceEventRepository);
                    services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
            }).CreateClient();

            return client;
        }

        /// <summary>
        /// Create a DocumentClientException using reflection because all constructors are internal.
        /// </summary>
        /// <param name="message">Exception message</param>
        /// <param name="httpStatusCode">The HttpStatus code.</param>
        /// <returns></returns>
        private static DocumentClientException CreateDocumentClientExceptionForTesting(string message, HttpStatusCode httpStatusCode)
        {
            Type type = typeof(DocumentClientException);

            string fullName = type.FullName ?? "wtf?";

            object documentClientExceptionInstance = type.Assembly.CreateInstance(
                fullName,
                false,
                BindingFlags.Instance | BindingFlags.NonPublic,
                null,
                new object[] { message, null, null, httpStatusCode, null },
                null,
                null);

            return (DocumentClientException)documentClientExceptionInstance;
        }
    }
}
