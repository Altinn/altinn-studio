using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;

using Altinn.Common.PEP.Interfaces;

using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.UnitTest.Mocks;
using Altinn.Platform.Storage.UnitTest.Mocks.Authentication;
using Altinn.Platform.Storage.UnitTest.Mocks.Repository;
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
    public partial class IntegrationTests
    {
        public class MessageBoxInstancesControllerTests : IClassFixture<WebApplicationFactory<Startup>>
        {
            private const string BasePath = "/storage/api/v1";
            private readonly WebApplicationFactory<Startup> _factory;

            /// <summary>
            /// Initializes a new instance of the <see cref="MessageBoxInstancesControllerTests"/> class with the given <see cref="WebApplicationFactory{TStartup}"/>.
            /// </summary>
            /// <param name="factory">The <see cref="WebApplicationFactory{TStartup}"/> to use when setting up the test server.</param>
            public MessageBoxInstancesControllerTests(WebApplicationFactory<Startup> factory)
            {
                _factory = factory;
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
            public async void GetMessageBoxInstanceList_RequestAllInstancesForAnOwnerWithoutLanguage_ReturnsAllElementsUsingDefaultLanguage()
            {
                // Arrange
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.GetAsync($"{BasePath}/sbl/instances/{1337}?state=active");

                // Assert
                string content = await response.Content.ReadAsStringAsync();
                List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(content);

                int expectedCount = 10;
                string expectedTitle = "Endring av navn (RF-1453)";
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
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.GetAsync($"{BasePath}/sbl/instances/1337?state=active&language=en");
                string content = await response.Content.ReadAsStringAsync();
                List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(content);

                int actualCount = messageBoxInstances.Count;
                string actualTitle = messageBoxInstances.First().Title;

                // Assert
                int expectedCount = 10;
                string expectedTitle = "Name change";
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
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage responseMessage = await client.GetAsync($"{BasePath}/sbl/instances/{1337}?state=archived");

                // Assert
                Assert.Equal(HttpStatusCode.OK, responseMessage.StatusCode);

                string responseContent = await responseMessage.Content.ReadAsStringAsync();
                List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(responseContent);

                int actualCount = messageBoxInstances.Count;
                int expectedCount = 4;
                Assert.Equal(expectedCount, actualCount);
            }

            /// <summary>
            /// Scenario:
            ///   Request an existing instance.
            /// Expected:
            ///  A converted instance is returned.
            /// Success:
            ///  The instance has the expected properties.
            /// </summary>
            [Fact]
            public async void GetMessageBoxInstance_RequestsExistingInstance_InstanceIsSuccessfullyMappedAndReturned()
            {
                // Arrange
                string instanceId = "1337/6323a337-26e7-4d40-89e8-f5bb3d80be3a";
                string expectedTitle = "Name change";

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage responseMessage = await client.GetAsync($"{BasePath}/sbl/instances/{instanceId}?language=en");

                // Assert
                Assert.Equal(HttpStatusCode.OK, responseMessage.StatusCode);

                string responseContent = await responseMessage.Content.ReadAsStringAsync();
                MessageBoxInstance actual = JsonConvert.DeserializeObject<MessageBoxInstance>(responseContent);

                Assert.Equal(expectedTitle, actual.Title);
                Assert.True(actual.AllowDelete);
                Assert.True(actual.AuthorizedForWrite);
            }

            /// <summary>
            /// Scenario:
            ///   Request an existing instance.
            /// Expected:
            ///  A converted instance is returned.
            /// Success:
            ///  The instance does not have allowed to delete permissions.
            /// </summary>
            [Fact]
            public async void GetMessageBoxInstance_RequestsExistingInstanceUserCannotDelete_InstanceIsSuccessfullyMappedAndReturned()
            {
                // Arrange
                string instanceId = "1606/6323a337-26e7-4d40-89e8-f5bb3d80be3a";

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1606, 3));

                // Act
                HttpResponseMessage responseMessage = await client.GetAsync($"{BasePath}/sbl/instances/{instanceId}?language=en");

                // Assert
                Assert.Equal(HttpStatusCode.OK, responseMessage.StatusCode);

                string responseContent = await responseMessage.Content.ReadAsStringAsync();
                MessageBoxInstance actual = JsonConvert.DeserializeObject<MessageBoxInstance>(responseContent);

                Assert.False(actual.AllowDelete);
                Assert.True(actual.AuthorizedForWrite);
            }

            /// <summary>
            /// Scenario:
            ///   Request an instance the user is not authorized to see
            /// Expected:
            ///   Authorization stops the request
            /// Success:
            ///   Forbidden response.
            /// </summary>
            [Fact]
            public async void GetMessageBoxInstance_RequestsInstanceUserIsNotAuthorized_ForbiddenReturned()
            {
                // Arrange
                string instanceId = "1337/6323a337-26e7-4d40-89e8-f5bb3d80be3a";

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1, 1606, 3));

                // Act
                HttpResponseMessage responseMessage = await client.GetAsync($"{BasePath}/sbl/instances/{instanceId}?language=en");

                // Assert     
                Assert.Equal(HttpStatusCode.Forbidden, responseMessage.StatusCode);
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
                TestDataUtil.DeleteInstanceAndData(1337, new Guid("da1f620f-1764-4f98-9f03-74e5e20f10fe"));
                TestDataUtil.PrepareInstance(1337, new Guid("da1f620f-1764-4f98-9f03-74e5e20f10fe"));
                // Arrange
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/{1337}/da1f620f-1764-4f98-9f03-74e5e20f10fe/undelete", null);

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                
                string content = await response.Content.ReadAsStringAsync();
                bool actualResult = JsonConvert.DeserializeObject<bool>(content);

                Assert.True(actualResult);
                TestDataUtil.DeleteInstanceAndData(1337, new Guid("da1f620f-1764-4f98-9f03-74e5e20f10fe"));
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
                HttpClient client = GetTestClient();
                string token = PrincipalUtil.GetToken(1337, 1337, 1);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/{1337}/cd41b024-f6b8-4ca7-9080-adc9eca5f0d1/undelete", null);

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
                HttpClient client = GetTestClient();
                string token = PrincipalUtil.GetToken(-1, 1);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/{1337}/cd41b024-f6b8-4ca7-9080-adc9eca5f0d1/undelete", null);

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
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/1337/f888c42b-8749-41d6-8048-8fc28c70beaa/undelete", null);

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
            ///   Internal server error
            /// </summary>
            [Fact]
            public async void Undelete_RestoreNonExistentInstance_ReturnsNotFound()
            {
                // Arrange
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.PutAsync($"{BasePath}/sbl/instances/1337/4be22ede-a16c-4a93-be7f-c529788d6a4c/undelete", null);

                // Assert
                Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
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
                TestDataUtil.DeleteInstanceAndData(1337, new Guid("08274f48-8313-4e2d-9788-bbdacef5a54e"));
                TestDataUtil.PrepareInstance(1337, new Guid("08274f48-8313-4e2d-9788-bbdacef5a54e"));

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/1337/08274f48-8313-4e2d-9788-bbdacef5a54e?hard=false");

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                string content = await response.Content.ReadAsStringAsync();
                bool actualResult = JsonConvert.DeserializeObject<bool>(content);
                Assert.True(actualResult);
                TestDataUtil.DeleteInstanceAndData(1337, new Guid("08274f48-8313-4e2d-9788-bbdacef5a54e"));
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
                Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
                instanceEventRepository.Setup(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>())).ReturnsAsync((InstanceEvent r) => r);

                HttpClient client = GetTestClient();
                string token = PrincipalUtil.GetToken(1337, 1337, 1);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/1337/6323a337-26e7-4d40-89e8-f5bb3d80be3a?hard=false");

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
                HttpClient client = GetTestClient();
                string token = PrincipalUtil.GetToken(-1, 1);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/1337/6323a337-26e7-4d40-89e8-f5bb3d80be3a?hard=false");

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
            public async void Delete_HardDeleteSoftDeleted()
            {
                // Arrange
                TestDataUtil.DeleteInstanceAndData(1337, new Guid("7a951b5b-ef96-4032-9273-f8d7651266f4"));
                TestDataUtil.PrepareInstance(1337, new Guid("7a951b5b-ef96-4032-9273-f8d7651266f4"));
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/1337/7a951b5b-ef96-4032-9273-f8d7651266f4?hard=true");

                // Assert
                HttpStatusCode actualStatusCode = response.StatusCode;
                string content = await response.Content.ReadAsStringAsync();
                bool actualResult = JsonConvert.DeserializeObject<bool>(content);

                HttpStatusCode expectedStatusCode = HttpStatusCode.OK;
                bool expectedResult = true;
                Assert.Equal(expectedResult, actualResult);
                Assert.Equal(expectedStatusCode, actualStatusCode);
                TestDataUtil.DeleteInstanceAndData(1337, new Guid("7a951b5b-ef96-4032-9273-f8d7651266f4"));
            }

            /// <summary>
            /// Scenario:
            ///  Delete an active instance, user has write priviliges
            /// Expected result:
            ///   Instance is marked for hard delete.
            /// Success criteria:
            ///   True is returned for the http request.
            /// </summary>
            [Fact]
            public async void Delete_ActiveHasRole_ReturnsOk()
            {
                TestDataUtil.DeleteInstanceAndData(1337, new Guid("d9a586ca-17ab-453d-9fc5-35eaadb3369b"));
                TestDataUtil.PrepareInstance(1337, new Guid("d9a586ca-17ab-453d-9fc5-35eaadb3369b"));

                // Arrange
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/1337/d9a586ca-17ab-453d-9fc5-35eaadb3369b?hard=true");
                string content = await response.Content.ReadAsStringAsync();
                bool actualResult = JsonConvert.DeserializeObject<bool>(content);

                // Assert
                Assert.True(actualResult);
                TestDataUtil.DeleteInstanceAndData(1337, new Guid("d9a586ca-17ab-453d-9fc5-35eaadb3369b"));
            }

            /// <summary>
            /// Scenario:
            ///  Delete an active instance, user does not have priviliges
            /// Expected result:
            ///  No changes are made to the instance
            /// Success criteria:
            ///   Forbidden is returned for the http request.
            /// </summary>
            [Fact]
            public async void Delete_ActiveMissingRole_ReturnsForbidden()
            {
                // Arrange
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1, 1, 3));

                // Act
                HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/1337/e6efc10e-913b-4a81-a36a-02376f5f5678?hard=true");
                HttpStatusCode actualStatusCode = response.StatusCode;

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, actualStatusCode);
            }

            /// <summary>
            /// Scenario:
            ///  Delete an archived instance, user has delete priviliges
            /// Expected result:
            ///   Instance is marked for hard delete.
            /// Success criteria:
            ///   True is returned for the http request.
            /// </summary>
            [Fact]
            public async void Delete_ArchivedHasRole_ReturnsOk()
            {
                TestDataUtil.DeleteInstanceAndData(1337,"3b67392f-36c6-42dc-998f-c367e771dcdd");
                TestDataUtil.PrepareInstance(1337, "3b67392f-36c6-42dc-998f-c367e771dcdd");
                // Arrange
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));

                // Act
                HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/1337/3b67392f-36c6-42dc-998f-c367e771dcdd?hard=false");
                HttpStatusCode actualStatusCode = response.StatusCode;
                string content = await response.Content.ReadAsStringAsync();
                bool actualResult = JsonConvert.DeserializeObject<bool>(content);

                // Assert
                Assert.True(actualResult);
                Assert.Equal(HttpStatusCode.OK, actualStatusCode);
                TestDataUtil.DeleteInstanceAndData(1337, "3b67392f-36c6-42dc-998f-c367e771dcdd");
            }

            /// <summary>
            /// Scenario:
            ///  Delete an archived instance, user does not have priviliges
            /// Expected result:
            ///  No changes are made to the instance
            /// Success criteria:
            ///   Forbidden is returned for the http request.
            /// </summary>
            [Fact]
            public async void Delete_ArchivedMissingRole_ReturnsForbidden()
            {
                // Arrange
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1, 1337, 3));

                // Act
                HttpResponseMessage response = await client.DeleteAsync($"{BasePath}/sbl/instances/1337/367a5e5a-12c6-4a74-b72b-766d95f859b0?hard=false");
                HttpStatusCode actualStatusCode = response.StatusCode;

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, actualStatusCode);
            }

            private HttpClient GetTestClient()
            {
                // No setup required for these services. They are not in use by the MessageBoxInstancesController
                Mock<IDataRepository> dataRepository = new Mock<IDataRepository>();
                Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
                Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();
                Mock<IPartiesWithInstancesClient> partiesWrapper = new Mock<IPartiesWithInstancesClient>();

                Program.ConfigureSetupLogging();
                HttpClient client = _factory.WithWebHostBuilder(builder =>
                {
                    builder.ConfigureTestServices(services =>
                    {
                        services.AddSingleton(dataRepository.Object);
                        services.AddSingleton<IApplicationRepository, ApplicationRepositoryMock>();
                        services.AddSingleton<IInstanceEventRepository, InstanceEventRepositoryMock>();
                        services.AddSingleton<IInstanceRepository, InstanceRepositoryMock>();
                        services.AddSingleton(sasTokenProvider.Object);
                        services.AddSingleton(keyVaultWrapper.Object);
                        services.AddSingleton(partiesWrapper.Object);
                        services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                        services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    });
                }).CreateClient();

                return client;
            }
        }
    }
}
