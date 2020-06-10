using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTests
{
    public class InstanceApiTest: IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public InstanceApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test that verifies Get for a existing instance
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task Instance_Get_OK()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/26133fb5-a9f2-45d4-90b1-f6d93ad40713");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("1337", instance.InstanceOwner.PartyId);
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
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn",1337, new Guid(createdInstance.Id.Split('/')[1]));

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

            HttpResponseMessage response =  await client.PostAsync(uri, formData);

            response.EnsureSuccessStatusCode();

            Assert.True(response.StatusCode == HttpStatusCode.Created);

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(createdInstance);
            Assert.Single(createdInstance.Data);
            Assert.Equal("default", createdInstance.Data[0].DataType);

            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new Guid(createdInstance.Id.Split('/')[1]));
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

                TestDataUtil.DeleteInstanceAndData("tdd", "custom-validering", 1337, new Guid(createdInstance.Id.Split('/')[1]));
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
    }
}
