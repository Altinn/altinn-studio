
using Altinn.App.IntegrationTests;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
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
        public async Task Data_Get_Forbidden()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "no-access");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/no-access/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/f0244552-c793-4bdf-b4ab-47d1a7413689")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: Send request to get app
        /// Expected: Response with two result will return status Forbidden
        /// </summary>

        [Fact]
        public async Task Data_Get_Forbidden2()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "no-access"); 
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/no-access/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: Send request to get app with min authentication level 2, user has level 2
        /// Expected: Response with result permit and status OK
        /// </summary>
        [Fact]
        public async Task Data_Get_Ok2()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "auth-level-2");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/auth-level-2/instances/1000/1916cd18-3b8e-46f8-aeaf-4bc3397ddd08/data/1fdd55c0-2016-49e0-97de-54b4abd1caa0")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        /// <summary>
        /// Test case: Send request to get app with min authentication level 3, user has level 2
        /// Expected: Response with result permit and status Forbidden
        /// </summary>
        [Fact]
        public async Task Data_Get_Forbidden3()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "auth-level-3"); 
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/auth-level-3/instances/1000/1c3a4b9d-cbbe-4146-b370-4164e925812b/data/ee60b341-fbc6-4bff-ade5-8f049555e1e6")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

    }
}
