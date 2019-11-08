using Altinn.App.IntegrationTests;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Models;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
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
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/skd/taxreport/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713")
            {
            };
         
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("1000", instance.InstanceOwnerId);
        }

        [Fact]
        public async Task Instance_Get_NotFound()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/skd/taxreport/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Instance_Post_Ok()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/skd/taxreport/instances/")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }



        private HttpClient GetTestClient()
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IInstance, InstanceMockSI>();
                });
            })
            .CreateClient();

            return client;
        }
    }
}
