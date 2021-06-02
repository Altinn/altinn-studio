using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTests
{
    public class InstanceApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public InstanceApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;

            EventsMockSI.Requests.Clear();
        }

        /// <summary>
        /// Test that verifies Get for a existing instance
        /// </summary>
        /// <remarks>
        /// Test also verifies that read status is unread first time
        /// a new instance is retrieved.
        /// </remarks>
        /// <returns></returns>
        [Fact]
        public async Task Instance_Get_OK()
        {
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new Guid("26133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/26133fb5-a9f2-45d4-90b1-f6d93ad40713");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstance("tdd", "endring-av-navn", 1337, new Guid("26133fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string responseContent = await response.Content.ReadAsStringAsync();

            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("1337", instance.InstanceOwner.PartyId);
            Assert.Equal(ReadStatus.Unread, instance.Status.ReadStatus);
        }

        /// <summary>
        /// Scenario where the caller uses a reference to a instance that does not exist. Impossible to authorize.
        /// Returns Foridden
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task Instance_Get_NotFound()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Instance_Post_WithQueryParamOk()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances?instanceOwnerPartyId=1337");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(instance);
            Assert.Equal("1337", instance.InstanceOwner.PartyId);

            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new Guid(instance.Id.Split('/')[1]));
        }

        [Fact]
        public async void Instance_Post_With_InstanceTemplate()
        {
            string token = PrincipalUtil.GetToken(1337);

            Instance instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = "1337",
                },
                DueBefore = DateTime.Parse("2020-01-01"),
            };

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            StringContent content = new StringContent(instanceTemplate.ToString(), Encoding.UTF8);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances")
            {
                Content = content,
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(responseContent);

            Assert.Equal("1337", createdInstance.InstanceOwner.PartyId);
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }

        /// <summary>
        /// Scenario: Failed retrival of register data
        /// Succsess criteria: Forbidden
        /// </summary>
        [Fact]
        public async Task Instance_Post_With_InstanceTemplate_UnuthorizedParty()
        {
            string token = PrincipalUtil.GetToken(1337);

            Instance instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = "1001",
                },
                DueBefore = DateTime.Parse("2020-01-01"),
            };

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            StringContent content = new StringContent(instanceTemplate.ToString(), Encoding.UTF8);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances")
            {
                Content = content,
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async void Post_RegistrationOfEventsTurnedOn_ControllerCallsEventWithCorrectType()
        {
            string org = "ttd";
            string app = "events";
            int partyId = 1337;

            Instance instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = partyId.ToString(),
                }
            };

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);

            string token = PrincipalUtil.GetToken(partyId);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            StringContent content = new StringContent(instanceTemplate.ToString(), Encoding.UTF8);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/{org}/{app}/instances")
            {
                Content = content
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(responseContent);

            Assert.Equal(partyId.ToString(), createdInstance.InstanceOwner.PartyId);

            //// Commented out the Asserts as another test might clear the Requests list and then fail these.
            ////Assert.Equal("app.instance.created", EventsMockSI.Requests.First().eventType);
            ////Assert.NotNull(EventsMockSI.Requests.First().instance);

            TestDataUtil.DeleteInstanceAndData(org, app, partyId, new Guid(createdInstance.Id.Split('/')[1]));
        }

        [Fact]
        public async void Instance_Post_With_InstanceTemplate_Org()
        {
            string token = PrincipalUtil.GetOrgToken("tdd");

            Instance instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = "1337",
                },
                DueBefore = DateTime.Parse("2020-01-01"),
            };

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            StringContent content = new StringContent(instanceTemplate.ToString(), Encoding.UTF8);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances")
            {
                Content = content,
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(responseContent);

            Assert.Equal("1337", createdInstance.InstanceOwner.PartyId);
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }

        /// <summary>
        /// create a multipart request with instance and xml prefil.
        /// </summary>
        [Fact]
        public async void Instance_Post_WithMultipartPrefill()
        {
            /* SETUP */
            string instanceOwnerPartyId = "1337";

            Instance instanceTemplate = new Instance()
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = instanceOwnerPartyId,
                }
            };

            string instance = JsonConvert.SerializeObject(instanceTemplate);
            string xml = File.ReadAllText("Data/Files/data-element.xml");

            string boundary = "abcdefgh";
            MultipartFormDataContent formData = new MultipartFormDataContent(boundary)
            {
                { new StringContent(instance, Encoding.UTF8, "application/json"), "instance" },
                { new StringContent(xml, Encoding.UTF8, "application/xml"), "default" }
            };

            Uri uri = new Uri("/tdd/endring-av-navn/instances", UriKind.Relative);

            /* TEST */

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            string token = PrincipalUtil.GetToken(1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpResponseMessage response = await client.PostAsync(uri, formData);

            response.EnsureSuccessStatusCode();

            Assert.True(response.StatusCode == HttpStatusCode.Created);

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(createdInstance);
            Assert.Single(createdInstance.Data);
            Assert.Equal("default", createdInstance.Data[0].DataType);

            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }

        /// <summary>
        /// create a multipart request with instance and xml prefil for both form and message for nabovarsel
        /// </summary>
        [Fact]
        public async void Instance_Post_NabovarselWithMessageAndForm()
        {
            // Arrange
            string instanceOwnerPartyId = "1337";

            Instance instanceTemplate = new Instance()
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = instanceOwnerPartyId,
                }
            };

            string instance = JsonConvert.SerializeObject(instanceTemplate);
            string xml = File.ReadAllText("Data/Files/SvarPaaNabovarselType.xml");
            string xmlmelding = File.ReadAllText("Data/Files/melding.xml");

            string boundary = "abcdefgh";
            MultipartFormDataContent formData = new MultipartFormDataContent(boundary)
            {
                { new StringContent(instance, Encoding.UTF8, "application/json"), "instance" },
                { new StringContent(xml, Encoding.UTF8, "application/xml"), "skjema" },
                { new StringContent(xmlmelding, Encoding.UTF8, "application/xml"), "melding" }
            };

            Uri uri = new Uri("/dibk/nabovarsel/instances", UriKind.Relative);

            // ACT
            HttpClient client = SetupUtil.GetTestClient(_factory, "dibk", "nabovarsel");
            string token = PrincipalUtil.GetOrgToken("dibk");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpResponseMessage response = await client.PostAsync(uri, formData);

            // Assert
            response.EnsureSuccessStatusCode();
            Assert.True(response.StatusCode == HttpStatusCode.Created);

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(createdInstance);
            Assert.Equal(2, createdInstance.Data.Count);
            TestDataUtil.DeleteInstanceAndData("dibk", "nabovarsel", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }

        [Fact]
        public async Task Instance_Post_WithInstantiationValidationFail()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/custom-validation/instances?instanceOwnerPartyId=1337");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
            InstantiationValidationResult validationResult = JsonConvert.DeserializeObject<InstantiationValidationResult>(responseContent);

            if (DateTime.Now.Hour < 15)
            {
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
                Assert.False(validationResult.Valid);
                Assert.Equal("ERROR: Instantiation not possible before 3PM.", validationResult.Message);
            }
            else
            {
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);
                Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());
                
                Assert.NotNull(createdInstance);
                Assert.Single(createdInstance.Data);
                Assert.Equal("default", createdInstance.Data[0].DataType);

                TestDataUtil.DeleteInstanceAndData("tdd", "custom-validation", 1337, new Guid(createdInstance.Id.Split('/')[1]));
            }
        }

        [Fact]
        public async Task Instance_Post_WithQueryParamOk_AuthCookie()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            HttpRequestMessage httpRequestMessageHome = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/");

            SetupUtil.AddAuthCookie(httpRequestMessageHome, token);

            HttpResponseMessage responseHome = await client.SendAsync(httpRequestMessageHome);

            string xsrfToken = SetupUtil.GetXsrfCookieValue(responseHome);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances?instanceOwnerPartyId=1337");

            SetupUtil.AddAuthCookie(httpRequestMessage, token, xsrfToken);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(instance);
            Assert.Equal("1337", instance.InstanceOwner.PartyId);

            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new Guid(instance.Id.Split('/')[1]));
        }

        [Fact]
        public async Task Instance_Post_WithQueryParamInvalidCsrf_AuthCookie()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            HttpRequestMessage httpRequestMessageHome = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/");

            SetupUtil.AddAuthCookie(httpRequestMessageHome, token);

            HttpResponseMessage responseHome = await client.SendAsync(httpRequestMessageHome);

            string xsrfToken = SetupUtil.GetXsrfCookieValue(responseHome);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances?instanceOwnerPartyId=1000");

            xsrfToken = xsrfToken + "THIS_MAKE_THE_TOKEN_INVALID";
            SetupUtil.AddAuthCookie(httpRequestMessage, token, xsrfToken);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();

            Assert.NotNull(content);
        }

        [Fact]
        public async Task Instance_Post_WithLowAuthLevel_FailOk()
        {
            string token = PrincipalUtil.GetToken(1337, 1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances?instanceOwnerPartyId=1337");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();
            Dictionary<string, string> failedObligations = JsonConvert.DeserializeObject<Dictionary<string, string>>(responseContent);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.NotNull(failedObligations);

            Dictionary<string, string> expectedFailedObligations = new Dictionary<string, string>() { { "RequiredAuthenticationLevel", "2" } };
            Assert.Equal(expectedFailedObligations, failedObligations);
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
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";

            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));
            TestDataUtil.PrepareInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);

            string token = PrincipalUtil.GetOrgToken(org);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/complete";

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Don't compare original and updated instance in asserts. The two instances are identical.
            Assert.NotNull(updatedInstance);
            Assert.Equal(org, updatedInstance.CompleteConfirmations[0].StakeholderId);
            Assert.Equal($"{instanceOwnerPartyId}/{instanceGuid}", updatedInstance.Id);
        }

        /// <summary>
        /// Scenario:
        ///   An Application Owner attempts to complete an instance for an application not owned by them.
        /// Result:
        ///   The response returns status code Forbidden.
        /// </summary>
        [Fact]
        public async void AddCompleteConfirmation_AttemptToCompleteInstanceAsDifferentOrg_ReturnsForbidden()
        {
            // Arrange
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";

            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));
            TestDataUtil.PrepareInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);

            string token = PrincipalUtil.GetOrgToken("brg");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/complete";

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Attempt to complete an instance as the instance owner.
        /// Result:
        ///   The response returns status code Forbidden.
        /// </summary>
        [Fact]
        public async void AddCompleteConfirmation_AttemptToCompleteInstanceAsUser_ReturnsForbidden()
        {
            // Arrange
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";

            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));
            TestDataUtil.PrepareInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);

            string token = PrincipalUtil.GetToken(21023); // 21023 is connected to party with id 1337
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/complete";

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(string.Empty));

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
        public async void UpdateSubstatus_MissingLabel_ReturnsBadRequest()
        {
            // Arrange
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";

            Substatus substatus = new Substatus { Description = "Substatus.Approved.Description" };
            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);

            string token = PrincipalUtil.GetOrgToken(org);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/substatus";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri);
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(substatus), Encoding.UTF8, "application/json");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        /// Actor with user claims attemts to update substatus for an instance.
        /// Result:
        /// Response is 403 forbidden.
        /// </summary>
        [Fact]
        public async void UpdateSubstatus_EndUserTriestoSetSubstatus_ReturnsForbidden()
        {
            // Arrange
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";
            TestDataUtil.PrepareInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            Substatus substatus = new Substatus { Label = "Substatus.Approved.Label", Description = "Substatus.Approved.Description" };
            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);

            string token = PrincipalUtil.GetToken(21023); // 21023 is connected to party with id 1337
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/substatus";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri);
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(substatus), Encoding.UTF8, "application/json");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        /// Update substatus for an instance where the substatus has not been initialized yet.
        /// Result:
        /// substatus is successfuly updated and the updated instance returned.
        /// </summary>
        [Fact]
        public async void UpdateSubstatus_SetInitialSubstatus_ReturnsUpdatedInstance()
        {
            // Arrange
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";
            Substatus expectedSubstatus = new Substatus { Label = "Substatus.Approved.Label", Description = "Substatus.Approved.Description" };
            TestDataUtil.PrepareInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);

            string token = PrincipalUtil.GetOrgToken("tdd");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/substatus";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri);
            httpRequestMessage.Content = new StringContent(
                JsonConvert.SerializeObject(new Substatus
                {
                    Label = "Substatus.Approved.Label",
                    Description = "Substatus.Approved.Description"
                }),
                Encoding.UTF8,
                "application/json");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            string json = await response.Content.ReadAsStringAsync();
            Instance updatedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.NotNull(updatedInstance);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedSubstatus.Label, updatedInstance.Status.Substatus.Label);
            Assert.Equal(expectedSubstatus.Description, updatedInstance.Status.Substatus.Description);
            Assert.True(updatedInstance.LastChanged > DateTime.UtcNow.AddMinutes(-5));
        }

        /// <summary>
        /// Scenario:
        ///   Attempt to delete an instance user does not have rights to delete.
        /// Result:
        ///   The response returns status code Forbidden.
        /// </summary>
        [Fact]
        public async void DeleteInstance_UnauthorizedUserAttemptsToDelete_ReturnsForbidden()
        {
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";

            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));
            TestDataUtil.PrepareInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            string token = PrincipalUtil.GetToken(21023); // 21023 is connected to party with id 1337
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, requestUri);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Attempt to hard  delete an instance.
        /// Result:
        ///   The response includes the deleted instance with the correct properties updated.
        /// </summary>
        [Fact]
        public async void DeleteInstance_EndUserHardDeletesInstance_BothHardAndSoftDeleteSetOnInstance()
        {
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";

            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));
            TestDataUtil.PrepareInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            string token = PrincipalUtil.GetToken(1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}?hard=true";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, requestUri);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            string json = await response.Content.ReadAsStringAsync();
            Instance deletedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.NotNull(deletedInstance.Status.HardDeleted);
            Assert.NotNull(deletedInstance.Status.SoftDeleted);
        }

        /// <summary>
        /// Scenario:
        ///   Attempt to hard  delete an instance.
        /// Result:
        ///   The response includes the deleted instance with the correct properties updated.
        /// </summary>
        [Fact]
        public async void DeleteInstance_AppOwnerSoftDletesInstance_DeleteSetOnInstance()
        {
            string org = "tdd";
            string app = "endring-av-navn";
            int instanceOwnerPartyId = 1337;
            string instanceGuid = "66233fb5-a9f2-45d4-90b1-f6d93ad40713";

            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));
            TestDataUtil.PrepareInstance(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            string token = PrincipalUtil.GetOrgToken("tdd");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, requestUri);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstanceAndData(org, app, instanceOwnerPartyId, new Guid(instanceGuid));

            string json = await response.Content.ReadAsStringAsync();
            Instance deletedInstance = JsonConvert.DeserializeObject<Instance>(json);

            // Assert
            Assert.Null(deletedInstance.Status.HardDeleted);
            Assert.NotNull(deletedInstance.Status.SoftDeleted);
        }
    }
}
