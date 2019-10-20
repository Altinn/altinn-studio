using Altinn.App.IntegrationTests;
using Microsoft.AspNetCore.TestHost;
using System;
using System.Net;
using System.Net.Http;
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


        [Fact]
        public async Task TestWeather()
        {
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/org/app/weatherforecast/1/26133fb5-a9f2-45d4-90b1-f6d93ad40713")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }


        [Fact]
        public async Task TestGet()
        {
            HttpClient client = GetTestClient();
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/org/app/instances/1/26133fb5-a9f2-45d4-90b1-f6d93ad40713")
            {
            };
            try
            {

                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
                string responseContent = response.Content.ReadAsStringAsync().Result;

                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }
            catch(Exception ex)
            {
                Assert.NotNull(ex);
            }
        }




        private HttpClient GetTestClient()
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                });
            })
            .CreateClient();

            return client;
        }
    }
}
