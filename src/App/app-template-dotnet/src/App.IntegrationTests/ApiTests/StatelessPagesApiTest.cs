using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Altinn.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.IntegrationTests;
using App.IntegrationTests.Utils;

using Newtonsoft.Json;

using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    /// <summary>
    /// Test clas for PagesController
    /// </summary>
    public class StatelessPagesApiTest : IClassFixture<CustomWebApplicationFactory<TestDummy>>
    {
        private readonly CustomWebApplicationFactory<TestDummy> _factory;

        public StatelessPagesApiTest(CustomWebApplicationFactory<TestDummy> factory)
        {
            _factory = factory;
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
                new HttpRequestMessage(HttpMethod.Post, $"/{org}/{app}/v1/pages/order");
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
                new HttpRequestMessage(HttpMethod.Post, $"/{org}/{app}/v1/pages/order?dataTypeId=default");
            httpRequestMessage.Content = new StringContent("{}", Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            List<string> actual = JsonConvert.DeserializeObject<List<string>>(responseContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expected, actual);
        }
    }
}
