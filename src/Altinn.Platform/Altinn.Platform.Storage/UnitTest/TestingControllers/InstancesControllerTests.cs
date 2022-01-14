using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

using Altinn.Common.PEP.Interfaces;

using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Fixture;
using Altinn.Platform.Storage.UnitTest.Mocks;
using Altinn.Platform.Storage.UnitTest.Mocks.Authentication;
using Altinn.Platform.Storage.UnitTest.Mocks.Clients;
using Altinn.Platform.Storage.UnitTest.Mocks.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;
using Altinn.Platform.Storage.Wrappers;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.TestHost;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;

using Newtonsoft.Json;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingControllers
{
    public class InstancesControllerTests : IClassFixture<TestApplicationFactory<Startup>>
    {
        private const string BasePath = "storage/api/v1/instances";

        private readonly TestApplicationFactory<Startup> _factory;

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="factory">The web application factory.</param>
        public InstancesControllerTests(TestApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test case: User has to low authentication level.
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async Task Get_UserHasTooLowAuthLv_ReturnsStatusForbidden()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20475edd-dc38-4ae0-bd64-1b20643f506c";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 0);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Get_One_Ok()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "46133fb5-a9f2-45d4-90b1-f6d93ad40713";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 3);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseContent = await response.Content.ReadAsStringAsync();
            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));
            Assert.Equal("1337", instance.InstanceOwner.PartyId);
        }

        [Fact]
        public async Task Get_One_Twice_Ok()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "377efa97-80ee-4cc6-8d48-09de12cc273d";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 3);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            RequestTracker.Clear();
            HttpResponseMessage response = await client.GetAsync(requestUri);
            HttpResponseMessage response2 = await client.GetAsync(requestUri);

            // Assert
            Assert.Equal(1, RequestTracker.GetRequestCount("GetDecisionForRequest1337/377efa97-80ee-4cc6-8d48-09de12cc273d"));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string responseContent = await response.Content.ReadAsStringAsync();
            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));
            Assert.Equal("1337", instance.InstanceOwner.PartyId);
            Assert.Equal(HttpStatusCode.OK, response2.StatusCode);
        }

        /// <summary>
        /// Test case: User tries to access element that he is not authorized for
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async Task Get_ReponseIsDeny_ReturnsStatusForbidden()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "23d6aa98-df3b-4982-8d8a-8fe67a53b828";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(1, 50001, 3);
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
        public async Task Post_ReponseIsDeny_ReturnsStatusForbidden()
        {
            // Arrange
            string appId = "tdd/endring-av-navn";
            string requestUri = $"{BasePath}?appId={appId}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(-1, 1);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Laste opp test instance..
            Instance instance = new Instance() { InstanceOwner = new InstanceOwner() { PartyId = "1337" }, Org = "tdd", AppId = "tdd/endring-av-navn" };

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, JsonContent.Create(instance, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: User has to low authentication level.
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async Task Post_UserHasTooLowAuthLv_ReturnsStatusForbidden()
        {
            // Arrange
            string appId = "tdd/endring-av-navn";
            string requestUri = $"{BasePath}?appId={appId}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 0);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Laste opp test instance..
            Instance instance = new Instance() { InstanceOwner = new InstanceOwner() { PartyId = "1337" }, Org = "tdd", AppId = "tdd/endring-av-navn" };

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, JsonContent.Create(instance, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: User has to low authentication level.
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async Task Post_Ok()
        {
            // Arrange
            string appId = "tdd/endring-av-navn";
            string requestUri = $"{BasePath}?appId={appId}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 3);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            Instance instance = new Instance { InstanceOwner = new InstanceOwner { PartyId = "1337" }, Org = "tdd", AppId = "tdd/endring-av-navn" };

            // Act
            HttpResponseMessage response = await client.PostAsync(
                requestUri,
                JsonContent.Create(instance, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.Equal("application/json; charset=utf-8", response.Content.Headers.ContentType.ToString());
            string json = await response.Content.ReadAsStringAsync();
            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(json);
            Assert.NotNull(createdInstance);
        }

        /// <summary>
        /// Test case: User has to low authentication level.
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async Task Delete_UserHasTooLowAuthLv_ReturnsStatusForbidden()
        {
            // Arrange
            int instanceOwnerId = 1337;
            string instanceGuid = "7e6cc8e2-6cd4-4ad4-9ce8-c37a767677b5";

            string requestUri = $"{BasePath}/{instanceOwnerId}/{instanceGuid}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337, 0);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: User tries to delete a element it is not authorized to delete
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async Task Delete_ResponseIsDeny_ReturnsStatusForbidden()
        {
            // Arrange
            int instanceOwnerId = 1337;
            string instanceGuid = "7e6cc8e2-6cd4-4ad4-9ce8-c37a767677b5";

            string requestUri = $"{BasePath}/{instanceOwnerId}/{instanceGuid}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(1, 1337, 3);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: App owner tries to hard delete an instance
        /// Expected: Returns success and deleted instance
        /// </summary>
        [Fact]
        public async Task Delete_OrgHardDeletesInstance_ReturnedInstanceHasStatusBothSoftAndHardDeleted()
        {
            // Arrange
            int instanceOwnerId = 1337;
            string instanceGuid = "7e6cc8e2-6cd4-4ad4-9ce8-c37a767677b5";

            string requestUri = $"{BasePath}/{instanceOwnerId}/{instanceGuid}?hard=true";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetOrgToken("tdd");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync(requestUri);

            string json = await response.Content.ReadAsStringAsync();
            Instance deletedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.NotNull(deletedInstance.Status.HardDeleted);
            Assert.NotNull(deletedInstance.Status.SoftDeleted);
            Assert.Equal(deletedInstance.Status.HardDeleted, deletedInstance.Status.SoftDeleted);
        }

        /// <summary>
        /// Test case: End user system tries to soft delete an instance
        /// Expected: Returns success and deleted instance
        /// </summary>
        [Fact]
        public async Task Delete_EndUserSoftDeletesInstance_ReturnedInstanceHasStatusOnlySoftDeleted()
        {
            // Arrange
            int instanceOwnerId = 1337;
            string instanceGuid = "7e6cc8e2-6cd4-4ad4-9ce8-c37a767677b5";

            string requestUri = $"{BasePath}/{instanceOwnerId}/{instanceGuid}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(1337, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync(requestUri);

            string json = await response.Content.ReadAsStringAsync();
            Instance deletedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.Null(deletedInstance.Status.HardDeleted);
            Assert.NotNull(deletedInstance.Status.SoftDeleted);
        }

        /// <summary>
        /// Test case: Org user requests to get multiple instances from one of their apps.
        /// Expected: List of instances is returned.
        /// </summary>
        [Fact]
        public async Task GetMany_OrgRequestsAllAppInstances_Ok()
        {
            // Arrange
            string requestUri = $"{BasePath}?appId=ttd/complete-test";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetOrgToken("ttd", scope: "altinn:serviceowner/instances.read");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            int expectedNoInstances = 3;

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);
            string json = await response.Content.ReadAsStringAsync();
            InstanceQueryResponse queryResponse = JsonConvert.DeserializeObject<InstanceQueryResponse>(json);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedNoInstances, queryResponse.Count);
        }

        /// <summary>
        /// Test case: Org user requests to get multiple instances from one of their apps.
        /// Expected: List of instances is returned.
        /// </summary>
        [Fact]
        public async Task GetMany_OrgRequestsAllAppInstancesAlternativeScope_Ok()
        {
            // Arrange
            string requestUri = $"{BasePath}?appId=ttd/complete-test";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetOrgToken("ttd", scope: "altinn:serviceowner/instances.read");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            int expectedNoInstances = 3;

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);
            string json = await response.Content.ReadAsStringAsync();
            InstanceQueryResponse queryResponse = JsonConvert.DeserializeObject<InstanceQueryResponse>(json);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedNoInstances, queryResponse.Count);
        }

        /// <summary>
        /// Test case: Org user requests to get all instances linked to their org.
        /// Expected: List of instances is returned.
        /// </summary>
        [Fact]
        public async Task GetMany_OrgRequestsAllInstances_Ok()
        {
            // Arrange
            string requestUri = $"{BasePath}?org=ttd";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetOrgToken("ttd", scope: "altinn:serviceowner/instances.read");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            int expectedNoInstances = 10;

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);
            string json = await response.Content.ReadAsStringAsync();
            InstanceQueryResponse queryResponse = JsonConvert.DeserializeObject<InstanceQueryResponse>(json);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedNoInstances, queryResponse.Count);
        }

        /// <summary>
        /// Test case: User requests to get multiple instances from a single instanceOwner - themselves.
        /// Expected: List of instances is returned.
        /// </summary>
        [Fact]
        public async Task GetMany_PartyRequestsOwnInstances_Ok()
        {
            // Arrange
            string requestUri = $"{BasePath}?instanceOwner.partyId=1600";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(10016, 1600, 4);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            int expectedNoInstances = 8;

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);
            string json = await response.Content.ReadAsStringAsync();
            InstanceQueryResponse queryResponse = JsonConvert.DeserializeObject<InstanceQueryResponse>(json);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedNoInstances, queryResponse.Count);
        }

        /// <summary>
        /// Test case: User requests to get multiple instances from a single instanceOwner they represent.
        /// Expected: List of instances is returned after unathorized instances are removed.
        /// </summary>
        [Fact]
        public async Task GetMany_UserRequestsAnotherPartiesInstances_Ok()
        {
            // Arrange
            string requestUri = $"{BasePath}?instanceOwner.partyId=1600";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            int expectedNoInstances = 3;

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);
            string json = await response.Content.ReadAsStringAsync();
            InstanceQueryResponse queryResponse = JsonConvert.DeserializeObject<InstanceQueryResponse>(json);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedNoInstances, queryResponse.Count);
        }

        /// <summary>
        /// Test case: Get Multiple instances without specifying instance owner partyId.
        /// Expected: Returns status bad request.
        /// </summary>
        [Fact]
        public async Task GetMany_UserRequestsInstancesNoPartyIdDefined_ReturnsBadRequest()
        {
            // Arrange
            string requestUri = $"{BasePath}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            string expected = "InstanceOwnerPartyId must be defined.";

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);
            string responseMessage = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains(expected, responseMessage);
        }

        /// <summary>
        /// Test case: Get Multiple instances without specifying org.
        /// Expected: Returns status bad request.
        /// </summary>
        [Fact]
        public async Task GetMany_OrgRequestsInstancesNoOrgDefined_ReturnsBadRequest()
        {
            // Arrange
            string requestUri = $"{BasePath}";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetOrgToken("testOrg", scope: "altinn:serviceowner/instances.read");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            string expected = "Org or AppId must be defined.";

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);
            string responseMessage = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains(expected, responseMessage);
        }

        /// <summary>
        /// Test case: Get Multiple instances using client with incorrect scope.
        /// Expected: Returns status forbidden.
        /// </summary>
        [Fact]
        public async Task GetMany_IncorrectScope_ReturnsForbidden()
        {
            // Arrange
            string requestUri = $"{BasePath}?org=testOrg";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetOrgToken("testOrg", scope: "altinn:serviceowner/instances.write");
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
        public async Task GetMany_QueryingDifferentOrgThanInClaims_ReturnsForbidden()
        {
            // Arrange
            string requestUri = $"{BasePath}?org=paradiseHotelOrg";

            HttpClient client = GetTestClient();
            string token = PrincipalUtil.GetOrgToken("testOrg", scope: "altinn:serviceowner/instances.read");
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
        public async Task AddCompleteConfirmation_PostAsValidAppOwner_RespondsWithUpdatedInstance()
        {
            // Arrange
            string org = "tdd";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "2f7fa5ce-e878-4e1f-a241-8c0eb1a83eab";
            string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";

            HttpClient client = GetTestClient();

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
            Assert.Equal(instanceId, updatedInstance.Id);
        }

        /// <summary>
        /// Scenario:
        ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed.
        ///   Something goes wrong when trying to save the updated instancee.
        /// Result:
        ///   The operation returns status InternalServerError
        /// </summary>
        [Fact]
        public async Task AddCompleteConfirmation_ExceptionDuringInstanceUpdate_ReturnsInternalServerError()
        {
            // Arrange
            string org = "tdd";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "d3b326de-2dd8-49a1-834a-b1d23b11e540";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetOrgToken(org);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

            // Assert
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed, but
        ///   they have already done so from before. The API makes no changes and return the original instancee.
        /// Result:
        ///   The given instance keeps the existing complete confirmation.
        /// </summary>
        [Fact]
        public async Task AddCompleteConfirmation_PostAsValidAppOwnerTwice_RespondsWithSameInstance()
        {
            // Arrange
            string org = "tdd";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "ef1b16fc-4566-4577-b2d8-db74fbee4f7c";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetOrgToken(org);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

            if (response.StatusCode.Equals(HttpStatusCode.InternalServerError))
            {
                string serverContent = await response.Content.ReadAsStringAsync();
                throw new Exception(serverContent);
            }

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Don't compare original and updated instance. The two variables point to the same instance.
            Assert.NotNull(updatedInstance);
            Assert.Equal(org, updatedInstance.CompleteConfirmations[0].StakeholderId);
            Assert.Equal("1337", updatedInstance.LastChangedBy);

            // Verify it is the stored instance that is returned
            Assert.Equal(6, updatedInstance.CompleteConfirmations[0].ConfirmedOn.Minute);
        }

        /// <summary>
        /// Scenario:
        ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed, but
        ///   the attempt to get the instance from the document database fails in an exception.
        /// Result:
        ///   The response has status code 500.
        /// </summary>
        [Fact]
        public async Task AddCompleteConfirmation_CompleteNonExistentInstance_ExceptionDuringAuthorization_RespondsWithInternalServerError()
        {
            // Arrange
            string org = "tdd";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "406d1e74-e4f5-4df1-833f-06ef16246a6f";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetOrgToken(org);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

            // Assert
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   A stakeholder calls the complete operation to indicate that they consider the instance as completed, but
        ///   the attempt to get the instance from the document database fails in an exception.
        /// Result:
        ///   The response has status code 500.
        /// </summary>
        [Fact]
        public async Task AddCompleteConfirmation_AttemptToCompleteInstanceAsUser_ReturnsForbidden()
        {
            // Arrange
            string org = "brg";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "8727385b-e7cb-4bf2-b042-89558c612826";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/complete";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetOrgToken(org);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        /// Update read status for an instance where the status has not been initialized yet.
        /// Result:
        /// Read status is successfuly updated and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdateReadStatus_SetInitialReadStatus_ReturnsUpdatedInstance()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "824e8304-ad9e-4d79-ac75-bcfa7213223b";

            ReadStatus expectedReadStus = ReadStatus.Read;

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/readstatus?status=read";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337, 2);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedReadStus, updatedInstance.Status.ReadStatus);
        }

        /// <summary>
        /// Scenario:
        /// Update read status for an instance with current status 'read'.
        /// Result:
        /// Read status is successfuly updated and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdateReadStatus_FromReadToUnread_ReturnsUpdatedInstance()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "d9a586ca-17ab-453d-9fc5-35eaadb3369b";
            ReadStatus expectedReadStus = ReadStatus.Unread;

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/readstatus?status=unread";
            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337, 2);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedReadStus, updatedInstance.Status.ReadStatus);
        }

        /// <summary>
        /// Scenario:
        /// Trying to update an instance with an invalid read status.
        /// Result:
        /// Response code is bad request.
        /// </summary>
        [Fact]
        public async Task UpdateReadStatus_InvalidStatus_ReturnsBadRequest()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "d9a586ca-17ab-453d-9fc5-35eaadb3369b";
            string expectedMessage = $"Invalid read status: invalid. Accepted types include: {string.Join(", ", Enum.GetNames(typeof(ReadStatus)))}";

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/readstatus?status=invalid";
            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337, 2);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string json = await response.Content.ReadAsStringAsync();
            string actualMessage = JsonConvert.DeserializeObject<string>(json);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(expectedMessage, actualMessage);
        }

        /// <summary>
        /// Scenario:
        /// Update substatus for an instance where the substatus has not been initialized yet.
        /// Result:
        /// substatus is successfuly updated and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdateSubstatus_SetInitialSubstatus_ReturnsUpdatedInstance()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20475edd-dc38-4ae0-bd64-1b20643f506c";

            Substatus expectedSubstatus = new Substatus { Label = "Substatus.Approved.Label", Description = "Substatus.Approved.Description" };

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/substatus";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetOrgToken("tdd");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(expectedSubstatus, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.NotNull(updatedInstance);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedSubstatus.Label, updatedInstance.Status.Substatus.Label);
            Assert.Equal(expectedSubstatus.Description, updatedInstance.Status.Substatus.Description);
            Assert.Equal("111111111", updatedInstance.LastChangedBy);
            Assert.True(updatedInstance.LastChanged > DateTime.UtcNow.AddMinutes(-5));
        }

        /// <summary>
        /// Scenario:
        /// Update substatus for an instance where there is a pre-existing substatus.
        /// Result:
        /// substatus is completely overwritten by the new substatus.
        /// </summary>
        [Fact]
        public async Task UpdateSubstatus_OverwriteSubstatus_DescriptionIsEmpty()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "67f568ce-f114-48e7-ba12-dd422f73667a";

            Substatus expectedSubstatus = new Substatus { Label = "Substatus.Approved.Label" };

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/substatus";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetOrgToken("tdd");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(expectedSubstatus, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.NotNull(updatedInstance);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedSubstatus.Label, updatedInstance.Status.Substatus.Label);
            Assert.Equal(expectedSubstatus.Description, updatedInstance.Status.Substatus.Description);
            Assert.Equal("111111111", updatedInstance.LastChangedBy);
            Assert.True(updatedInstance.LastChanged > DateTime.UtcNow.AddMinutes(-5));
        }

        /// <summary>
        /// Scenario:
        /// Actor with user claims attemts to update substatus for an instance.
        /// Result:
        /// Response is 403 forbidden.
        /// </summary>
        [Fact]
        public async Task UpdateSubstatus_EndUserTriestoSetSubstatus_ReturnsForbidden()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "824e8304-ad9e-4d79-ac75-bcfa7213223b";

            Substatus substatus = new Substatus { Label = "Substatus.Approved.Label", Description = "Substatus.Approved.Description" };

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/substatus";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(substatus, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        /// Org tries to update substatus without setting label.
        /// Result:
        /// Response is 400 bas request.
        /// </summary>
        [Fact]
        public async Task UpdateSubstatus_MissingLabel_ReturnsBadRequest()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "824e8304-ad9e-4d79-ac75-bcfa7213223b";

            Substatus substatus = new Substatus { Description = "Substatus.Approved.Description" };

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/substatus";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetOrgToken("tdd");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(substatus, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        /// Add presentation fields to an instance that doesn't have any existing presentation fields
        /// Result:
        /// Presentation fields are succesfully added and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdatePresentationFields_NoPreviousFieldsSet_ReturnsUpdatedInstance()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";

            PresentationTexts presentationTexts = new PresentationTexts
            {
                Texts = new Dictionary<string, string>
                {
                    { "key1", "value1" },
                    { "key2", "value2" }
                }
            };

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/presentationtexts";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(presentationTexts, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);
            Dictionary<string, string> actual = updatedInstance.PresentationTexts;

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(2, actual.Keys.Count);
        }

        /// <summary>
        /// Scenario:
        /// Update an existing presentation field 
        /// Result:
        /// Presentation field are succesfully updated, other fields are untouched and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdatePresentationFields_UpdateAnExistingPresentationField_ReturnsUpdatedInstance()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";

            PresentationTexts presentationTexts = new PresentationTexts
            {
                Texts = new Dictionary<string, string>
                {
                    { "key1", "updatedvalue1" },
                }
            };

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/presentationtexts";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(presentationTexts, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);
            Dictionary<string, string> actual = updatedInstance.PresentationTexts;

            // Assert
            Assert.Equal(2, actual.Keys.Count);
            Assert.True(actual.ContainsKey("key2"));
            Assert.Equal("updatedvalue1", actual["key1"]);
        }

        /// <summary>
        /// Scenario:
        /// Delete an existing presentation field 
        /// Result:
        /// Presentation field is succesfully removed, other fields are untouched and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdatePresentationFields_RemoveAnExistingPresentationField_ReturnsUpdatedInstance()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";

            const string removedKey = "key1";

            PresentationTexts presentationTexts = new PresentationTexts
            {
                Texts = new Dictionary<string, string>
                {
                    { removedKey, string.Empty },
                }
            };

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/presentationtexts";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(presentationTexts, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);
            Dictionary<string, string> actual = updatedInstance.PresentationTexts;

            // Assert
            Assert.Single(actual.Keys);
            Assert.True(actual.ContainsKey("key2"));
            Assert.False(actual.ContainsKey(removedKey));
        }

        /// <summary>
        /// Scenario:
        /// Add a new presentation field to an already existing collection of presentation fields
        /// Result:
        /// Presentation field is succesfully added to existing collection and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdatePresentationFields_AddNewPresentationFieldToExistingCollection_ReturnsUpdatedInstance()
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";

            PresentationTexts presentationTexts = new PresentationTexts
            {
                Texts = new Dictionary<string, string>
                {
                    { "key3", "value3" },
                }
            };

            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/presentationtexts";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(presentationTexts, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);
            Dictionary<string, string> actual = updatedInstance.PresentationTexts;

            // Assert
            Assert.Equal(3, actual.Keys.Count);
        }

        /// <summary>
        /// Scenario:
        /// Passes in null as presentation texts.
        /// Result:
        /// The existing collection is left as is, and a 400 Bad request is returned
        /// </summary>
        [Theory]
        [MemberData(nameof(GetPresentationTextsData))]
        public async Task UpdatePresentationFields_PassingNullAsPresentationTexts_Returns400(PresentationTexts presentationTexts)
        {
            // Arrange            
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";
            string requestPutUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/presentationtexts";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpPutRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestPutUri)
            {
                Content = JsonContent.Create(presentationTexts, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpPutRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        public static IEnumerable<object[]> GetPresentationTextsData()
        {
            yield return new object[] { new PresentationTexts() { Texts = null } };
            yield return new object[] { null };
        }

        /// <summary>
        /// Scenario:
        /// Add the value of a data field to an instance that doesn't have any existing data values
        /// Result:
        /// Data values are succesfully added and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdateDataValues_NoPreviousValuesSet_ReturnsUpdatedInstance()
        {
            // Arrange
            var dataValues = new DataValues
            {
                Values = new Dictionary<string, string>
                {
                    { "key1", "value1" },
                    { "key2", "value2" }
                }
            };

            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/datavalues";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(dataValues, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);
            Dictionary<string, string> actual = updatedInstance.DataValues;

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(2, actual.Keys.Count);
        }

        /// <summary>
        /// Scenario:
        /// Update an existing data value 
        /// Result:
        /// Data values are succesfully updated, other values are untouched and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdateDataValues_UpdateAnExistingDataValue_ReturnsUpdatedInstance()
        {
            // Arrange
            var dataValues = new DataValues
            {
                Values = new Dictionary<string, string>
                {
                    { "key1", "updatedvalue1" },
                }
            };

            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/datavalues";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(dataValues, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);
            Dictionary<string, string> actual = updatedInstance.DataValues;

            // Assert
            Assert.Equal(2, actual.Keys.Count);
            Assert.True(actual.ContainsKey("key2"));
            Assert.Equal("updatedvalue1", actual["key1"]);
        }

        /// <summary>
        /// Scenario:
        /// Delete an existing data value 
        /// Result:
        /// Data value is succesfully removed, other fields are untouched and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdateDataValues_RemoveAnExistingDataValue_ReturnsUpdatedInstance()
        {
            // Arrange
            const string removedKey = "key1";

            var dataValues = new DataValues
            {
                Values = new Dictionary<string, string>
                {
                    { removedKey, string.Empty },
                }
            };

            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/datavalues";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(dataValues, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);
            Dictionary<string, string> actual = updatedInstance.DataValues;

            // Assert
            Assert.Single(actual.Keys);
            Assert.True(actual.ContainsKey("key2"));
            Assert.False(actual.ContainsKey(removedKey));
        }

        /// <summary>
        /// Scenario:
        /// Add a new data value to an already existing collection of data values
        /// Result:
        /// Data value is succesfully added to existing collection and the updated instance returned.
        /// </summary>
        [Fact]
        public async Task UpdateDataValues_AddNewDataValueToExistingCollection_ReturnsUpdatedInstance()
        {
            // Arrange            
            var dataValues = new DataValues
            {
                Values = new Dictionary<string, string>
                {
                    { "key3", "value3" },
                }
            };

            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";
            string requestUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/datavalues";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = JsonContent.Create(dataValues, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);
            Dictionary<string, string> actual = updatedInstance.DataValues;

            // Assert
            Assert.Equal(3, actual.Keys.Count);
            Assert.Equal("value3", actual["key3"]);
        }

        /// <summary>
        /// Scenario:
        /// Passes in null as datavalue.
        /// Result:
        /// The existing collection is left as is, and a 400 Bad request is returned
        /// </summary>
        [Theory]
        [MemberData(nameof(GetDataValuesData))]
        public async Task UpdateDataValues_PassingNullAsDataValues_Returns400(DataValues dataValues)
        {
            // Arrange
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "20a1353e-91cf-44d6-8ff7-f68993638ffe";
            string requestPutUri = $"{BasePath}/{instanceOwnerPartyId}/{instanceGuid}/datavalues";

            HttpClient client = GetTestClient();

            string token = PrincipalUtil.GetToken(3, 1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpPutRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestPutUri)
            {
                Content = JsonContent.Create(dataValues, new MediaTypeHeaderValue("application/json"))
            };

            // Act
            HttpResponseMessage response = await client.SendAsync(httpPutRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        public static IEnumerable<object[]> GetDataValuesData()
        {
            yield return new object[] { new DataValues() { Values = null } };
            yield return new object[] { null };
        }

        private HttpClient GetTestClient()
        {
            // No setup required for these services. They are not in use by the InstanceController
            Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
            Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();

            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddMockRepositories();

                    services.AddSingleton(sasTokenProvider.Object);
                    services.AddSingleton(keyVaultWrapper.Object);
                    services.AddSingleton<IPartiesWithInstancesClient, PartiesWithInstancesClientMock>();
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
