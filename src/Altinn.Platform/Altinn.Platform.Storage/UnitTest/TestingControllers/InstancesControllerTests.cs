using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
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
using Microsoft.Azure.Documents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingControllers
{
    /// <summary>
    /// Represents a group of tests using the TestServer system to perform integration tests.
    /// Tests using the TestServer should ideally be limited to testing of controllers.
    /// </summary>
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

            /// <summary>
            /// Scenario:
            ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed.
            ///   The stakeholder is authorized and it is the first times they make this call.
            /// Result:
            ///   The given instance is updated with a new entry in CompleteConfirmations.
            /// </summary>
            [Fact]
            public async void AddCompleteConfirmation_PostAsValidAppOwner_RespondsWithUpdatedInstance()
            {
                // Arrange
                string org = "ttd";
                int instanceOwnerPartyId = 1;
                string instanceGuid = "cbdb00b1-4134-490d-b02b-3e33f7d8da33";
                string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";

                Instance originalInstance = new Instance
                {
                    Id = $"{instanceOwnerPartyId}/{instanceGuid}",
                    AppId = $"{org}/complete-test",
                    InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
                    Org = org,
                    Process = new ProcessState { EndEvent = "Success" }
                };

                Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
                instanceRepository.Setup(r => r.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(originalInstance);
                instanceRepository.Setup(r => r.Update(It.IsAny<Instance>())).ReturnsAsync((Instance i) => i);

                Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();
                instanceEventRepository.Setup(r => r.InsertInstanceEvent(It.IsAny<InstanceEvent>())).ReturnsAsync((InstanceEvent i) => i);

                HttpClient client = GetTestClient(instanceRepository.Object, instanceEventRepository.Object);

                string token = PrincipalUtil.GetOrgToken(org);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                string json = await response.Content.ReadAsStringAsync();
                Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

                // Don't compare original and updated instance in asserts. The two instances are identical.
                Assert.NotNull(updatedInstance);
                Assert.Equal(org, updatedInstance.CompleteConfirmations[0].StakeholderId);
                Assert.Equal("111111111", updatedInstance.LastChangedBy);
                
                // GetOne is called more than once because of Authorization.
                instanceRepository.Verify(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>()), Times.Exactly(3));
                instanceRepository.Verify(s => s.Update(It.IsAny<Instance>()), Times.Once);
                instanceEventRepository.Verify(s => s.InsertInstanceEvent(It.IsAny<InstanceEvent>()), Times.Once);
            }

            /// <summary>
            /// Scenario:
            ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed.
            ///   Something goes wrong when trying to save the updated instancee.
            /// Result:
            ///   The operation returns status InternalServerError
            /// </summary>
            [Fact]
            public async void AddCompleteConfirmation_ExceptionDuringInstanceUpdate_ReturnsInternalServerError()
            {
                // Arrange
                string org = "ttd";
                int instanceOwnerPartyId = 1;
                string instanceGuid = "cbdb00b1-4134-490d-b02b-3e33f7d8da33";
                string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";

                Instance originalInstance = new Instance
                {
                    Id = $"{instanceOwnerPartyId}/{instanceGuid}",
                    AppId = $"{org}/complete-test",
                    InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
                    Org = org,
                    Process = new ProcessState { EndEvent = "Success" }
                };
                
                DocumentClientException dex = CreateDocumentClientExceptionForTesting("Not Found", HttpStatusCode.NotFound);
                
                Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
                instanceRepository.Setup(r => r.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(originalInstance);
                instanceRepository.Setup(r => r.Update(It.IsAny<Instance>())).ThrowsAsync(dex);

                HttpClient client = GetTestClient(instanceRepository.Object);

                string token = PrincipalUtil.GetOrgToken(org);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

                // Assert
                Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
                
                // GetOne is called more than once because of Authorization.
                instanceRepository.Verify(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>()), Times.Exactly(3));
                instanceRepository.Verify(s => s.Update(It.IsAny<Instance>()), Times.Once);
            }

            /// <summary>
            /// Scenario:
            ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed, but
            ///   they have already done so from before. The API makes no changes and return the original instancee.
            /// Result:
            ///   The given instancee keeps the existing complete confirmation.
            /// </summary>
            [Fact]
            public async void AddCompleteConfirmation_PostAsValidAppOwnerTwice_RespondsWithSameInstance()
            {
                // Arrange
                string org = "ttd";
                int instanceOwnerPartyId = 1;
                string instanceGuid = "cbdb00b1-4134-490d-b02b-3e33f7d8da33";
                string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";
                DateTime confirmedOn = DateTime.UtcNow;

                Instance originalInstance = new Instance
                {
                    Id = $"{instanceOwnerPartyId}/{instanceGuid}",
                    AppId = $"{org}/complete-test",
                    InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
                    CompleteConfirmations = new List<CompleteConfirmation> { new CompleteConfirmation { ConfirmedOn = confirmedOn, StakeholderId = org } },
                    Org = org,
                    Process = new ProcessState { EndEvent = "Success" },
                    Title = new LanguageString()
                };
                originalInstance.Title.Add("nb", "norwegian");

                Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
                instanceRepository.Setup(r => r.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(originalInstance);

                HttpClient client = GetTestClient(instanceRepository.Object);

                string token = PrincipalUtil.GetOrgToken(org);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);

                string json = await response.Content.ReadAsStringAsync();
                Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

                // Don't compare original and updated instance in asserts. The two instances are identical.
                Assert.NotNull(updatedInstance);
                Assert.Equal(org, updatedInstance.CompleteConfirmations[0].StakeholderId);
                Assert.Equal(confirmedOn, updatedInstance.CompleteConfirmations[0].ConfirmedOn);

                // GetOne is called more than once because of Authorization.
                instanceRepository.Verify(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>()), Times.Exactly(3));
                instanceRepository.Verify(s => s.Update(It.IsAny<Instance>()), Times.Never);
            }

            /// <summary>
            /// Scenario:
            ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed, but
            ///   the attempt to get the instance from the document database fails in an exception.
            /// Result:
            ///   The response has status code 500.
            /// </summary>
            [Fact]
            public async void AddCompleteConfirmation_CompleteNonExistantInstance_ExceptionDuringAuthorization_RespondsWithInternalServerError()
            {
                // Arrange
                string org = "ttd";
                int instanceOwnerPartyId = 1;
                string instanceGuid = "cbdb00b1-4134-490d-b02b-3e33f7d8da33";
                string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";
                DateTime confirmedOn = DateTime.UtcNow;
                
                DocumentClientException dex = CreateDocumentClientExceptionForTesting("Not Found", HttpStatusCode.NotFound);

                Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
                instanceRepository.Setup(r => r.GetOne(It.IsAny<string>(), It.IsAny<int>())).ThrowsAsync(dex);

                HttpClient client = GetTestClient(instanceRepository.Object);

                string token = PrincipalUtil.GetOrgToken(org);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

                // Assert
                Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

                instanceRepository.Verify(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>()), Times.Once);
                instanceRepository.Verify(s => s.Update(It.IsAny<Instance>()), Times.Never);
            }

            /// <summary>
            /// Scenario:
            ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed, but
            ///   the attempt to get the instance from the document database fails in an exception.
            /// Result:
            ///   The response has status code 500.
            /// </summary>
            [Fact]
            public async void AddCompleteConfirmation_AttemptToCompleteInstanceAsUser_ReturnsForbidden()
            {
                // Arrange
                string org = "ttd";
                int instanceOwnerPartyId = 1;
                string instanceGuid = "cbdb00b1-4134-490d-b02b-3e33f7d8da33";
                string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";
                DateTime confirmedOn = DateTime.UtcNow;

                Instance originalInstance = new Instance
                {
                    Id = $"{instanceOwnerPartyId}/{instanceGuid}",
                    AppId = $"{org}/complete-test",
                    InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
                    CompleteConfirmations = new List<CompleteConfirmation> { new CompleteConfirmation { ConfirmedOn = confirmedOn, StakeholderId = org } },
                    Org = org,
                    Process = new ProcessState { EndEvent = "Success" }
                };

                Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
                instanceRepository.Setup(r => r.GetOne(It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(originalInstance);

                HttpClient client = GetTestClient(instanceRepository.Object);

                string token = PrincipalUtil.GetToken(1337);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

                instanceRepository.Verify(s => s.GetOne(It.IsAny<string>(), It.IsAny<int>()), Times.Once);
                instanceRepository.Verify(s => s.Update(It.IsAny<Instance>()), Times.Never);
            }

            private HttpClient GetTestClient(IInstanceRepository instanceRepository, IInstanceEventRepository instanceEventRepository = null)
            {
                Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
                Application testApp1 = new Application() { Id = "test/testApp1", Org = "test" };

                applicationRepository.Setup(s => s.FindOne(It.Is<string>(p => p.Equals("test/testApp1")), It.IsAny<string>())).ReturnsAsync(testApp1);
                
                // No setup required for these services. They are not in use by the InstanceController
                Mock<IDataRepository> dataRepository = new Mock<IDataRepository>();
                Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
                Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();

                instanceEventRepository ??= new Mock<IInstanceEventRepository>().Object;

                HttpClient client = _factory.WithWebHostBuilder(builder =>
                {
                    builder.ConfigureTestServices(services =>
                    {
                        services.AddSingleton(applicationRepository.Object);
                        services.AddSingleton(dataRepository.Object);
                        services.AddSingleton(instanceEventRepository);
                        services.AddSingleton(instanceRepository);
                        services.AddSingleton(sasTokenProvider.Object);
                        services.AddSingleton(keyVaultWrapper.Object);
                        services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                        services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    });
                }).CreateClient();

                return client;
            }

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
}
