
using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
using Newtonsoft.Json;
using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Xunit;

namespace App.IntegrationTests.ApiTests
{
    public class DataApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {

        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public DataApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Data_Post_WithoutContent_OK()
        {
            Guid guid = new Guid("36133fb5-a9f2-45d4-90b1-f6d93ad40713");
            TestDataUtil.DeleteDataForInstance("tdd", "endring-av-navn", 1000, guid);

            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1000/36133fb5-a9f2-45d4-90b1-f6d93ad40713/data?dataType=default")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            TestDataUtil.DeleteDataForInstance("tdd", "endring-av-navn", 1000, guid);
        }

        /// <summary>
        /// Test case: Send request to get app
        /// Expected: Response with result permit returns status OK
        /// </summary>
        [Fact]
        public async Task Data_Get_OK()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        /// <summary>
        /// Test case: Send request to get app
        /// Expected: Response with result deny returns status Forbidden
        /// </summary>
        [Fact]
        public async Task Data_Get_Forbidden_NotAuthorized()
        {
            string token = PrincipalUtil.GetToken(2);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

             /// <summary>
        /// Test case: Send request to get app with min authentication level 3, user has level 2
        /// Expected: Response with result permit and status Forbidden
        /// </summary>
        [Fact]
        public async Task Data_Get_Forbidden_ToLowAuthenticationLevel()
        {
            string token = PrincipalUtil.GetToken(1,1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Data_Get_With_Calculation()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1000/182e053b-3c74-46d4-92ec-a2828289a877/data/7dfeffd1-1750-4e4a-8107-c6741e05d2a9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Contains("\"journalnummerdatadef33316\":{\"orid\":33316,\"value\":1001}", responseContent);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Data_Post_With_DataCreation()
        {
            Guid guid = new Guid("609efc9d-4496-4f0b-9d20-808dc2c1876d");
            TestDataUtil.DeleteDataForInstance("tdd", "custom-validation", 1000, guid);

            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/custom-validation/instances/1000/609efc9d-4496-4f0b-9d20-808dc2c1876d/data?dataType=default")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/custom-validation/instances/1000/609efc9d-4496-4f0b-9d20-808dc2c1876d/data/{dataElement.Id}")
            {
            };

            response = await client.SendAsync(httpRequestMessage);
            responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("\"enhetNavnEndringdatadef31\":{\"orid\":31,\"value\":\"Test Test 123\"}", responseContent);

            TestDataUtil.DeleteDataForInstance("tdd", "custom-validation", 1000, guid);
        }

        /// <summary>
        /// Test case: post data with prefill setup
        /// Expected: returning data should contain prefilled values
        /// </summary>
        [Fact]
        public async Task Data_Post_With_Prefill_OK()
        {
            Guid guid = new Guid("36133fb5-a9f2-45d4-90b1-f6d93ad40713");
            TestDataUtil.DeleteDataForInstance("tdd", "endring-av-navn", 1000, guid);

            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Fetch data element
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/tdd/endring-av-navn/instances/1000/{guid}/data?dataType=default"){};
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);

            // Fetch data and compare with expected prefill
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/endring-av-navn/instances/1000/{guid}/data/{dataElement.Id}"){};
            response = await client.SendAsync(httpRequestMessage);
            responseContent = response.Content.ReadAsStringAsync().Result;
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            Assert.Contains("\"personMellomnavnAndreTilknyttetGardNavndatadef34931\":{\"orid\":34931,\"value\":\"12345678901\"}", responseContent);
            Assert.Contains("\"personMellomnavnAndreTilknyttetPersonsEtternavndatadef34930\":{\"orid\":34930,\"value\":\"Stokarknes\"}", responseContent);
            Assert.Contains("\"personMellomnavnAndreTilknytningBeskrivelsedatadef34928\":{\"orid\":34928,\"value\":\"Blåbærveien\"}", responseContent);

            TestDataUtil.DeleteDataForInstance("tdd", "endring-av-navn", 1000, guid);
        }

        /// <summary>
        /// Test case: post data with prefill setup for an org
        /// Expected: returning data should contain prefilled values
        /// </summary>
        [Fact]
        public async Task Data_Post_With_Prefill_Org_OK()
        {
            Guid guid = new Guid("37133fb5-a9f2-45d4-90b1-f6d93ad40713");
            TestDataUtil.DeleteDataForInstance("tdd", "endring-av-navn", 1002, guid);

            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Fetch data element
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/tdd/endring-av-navn/instances/1002/{guid}/data?dataType=default"){};
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);

            // Fetch data and compare with expected prefill
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/endring-av-navn/instances/1002/{guid}/data/{dataElement.Id}"){};
            response = await client.SendAsync(httpRequestMessage);
            responseContent = response.Content.ReadAsStringAsync().Result;
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            Assert.Contains("\"personMellomnavnAndreTilknyttetGardNavndatadef34931\":{\"orid\":34931,\"value\":\"Sofies Gate 2\"}", responseContent);
            Assert.Contains("\"personMellomnavnAndreTilknyttetPersonsEtternavndatadef34930\":{\"orid\":34930,\"value\":\"EAS Health Consulting\"}", responseContent);
            Assert.Contains("\"personMellomnavnAndreTilknytningBeskrivelsedatadef34928\":{\"orid\":34928,\"value\":\"http://setrabrl.no\"}", responseContent);

            TestDataUtil.DeleteDataForInstance("tdd", "endring-av-navn", 1002, guid);
        }


    }
}
