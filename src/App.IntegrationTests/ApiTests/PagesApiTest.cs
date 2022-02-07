using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;

using App.IntegrationTests.Utils;

using Newtonsoft.Json;

using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    /// <summary>
    /// Test clas for PagesController
    /// </summary>
    public class PagesApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public PagesApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Scenario: Request to get pages order, but user is not authorized.
        /// Successful: Access to the api is not granted. Unauthorized response.
        /// </summary>
        [Fact]
        public async Task GetPageOrder_NoTokenIncluded_NotAuthorizedResponse()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713/pages/order?dataTypeId=default");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        /// <summary>
        /// Scenario: Get page order for an app. DataTypeId not specified in query parameters.
        /// Successful: Bad request is returned..
        /// </summary>
        [Fact]
        public async Task GetPageOrder_DataTypeIdMissing_BadRequestIsReturned()
        {
            string org = "ttd";
            string app = "events";

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            string token = PrincipalUtil.GetToken(1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Post, $"/{org}/{app}/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713/pages/order");
            httpRequestMessage.Content = new StringContent("{}", Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Scenario: Get page order for an app without layout set. No custom implementation in app.
        /// Successful: Pages retrieved from layout settings and returned without manipulation.
        /// </summary>
        [Fact]
        public async Task GetPageOrder_NoCustomConfiguration_PageOrderIsRetrievedFromAppBaseAndReturned()
        {
            string org = "ttd";
            string app = "events";
            List<string> expected = new List<string> { "FormLayout", "Side2" };

            // Using default app here to not reference App.cs in the app repo.
            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            string token = PrincipalUtil.GetToken(1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Post, $"/{org}/{app}/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713/pages/order?dataTypeId=default");
            httpRequestMessage.Content = new StringContent("{}", Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            List<string> actual = JsonConvert.DeserializeObject<List<string>>(responseContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expected, actual);
        }

        /// <summary>
        /// Scenario: Get page order for an app without layout set. Custom implementation in app.cs should override AppBase.
        /// Successful: Pages retrieved from custom app code.
        /// </summary>
        [Fact]
        public async Task GetPageOrder_CustomConfiguration_PageOrderIsRetrievedFromAppAndReturned()
        {
            string org = "ttd";
            string app = "issue-5740";
            List<string> expected = new List<string> { "Side4", "Side2", "Side1", "Side3", "1337" };

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            string token = PrincipalUtil.GetToken(1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Post, $"/{org}/{app}/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713/pages/order?dataTypeId=default");
            httpRequestMessage.Content = new StringContent("{\"skjemanummer\": \"1337\"}", Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            List<string> actual = JsonConvert.DeserializeObject<List<string>>(responseContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expected, actual);
        }

        /// <summary>
        /// Scenario: Get page order for an app with layout set. No custom implementation in app.
        /// Successful: Pages retrieved from correct layout settings and returned without manipulation.
        /// </summary>
        [Fact]
        public async Task GetPageOrder_NoCustomConfigurationLayoutSet_PageOrderIsRetrievedFromAppBaseAndReturned()
        {
            string org = "ttd";
            string app = "frontend-test";
            List<string> expected = new List<string> { "formLayout", "summary" };

            // Using default app here to not reference App.cs in the app repo.
            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            string token = PrincipalUtil.GetToken(1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Post, $"/{org}/{app}/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713/pages/order?layoutSetId=changename&dataTypeId=message");
            httpRequestMessage.Content = new StringContent("{\"skjemanummer\": \"1337\"}", Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            List<string> actual = JsonConvert.DeserializeObject<List<string>>(responseContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expected, actual);
        }
    }
}
