using Altinn.App.Common.Interface;
using Altinn.App.IntegrationTests;
using Altinn.App.Services.Interface;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
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

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1000/36133fb5-a9f2-45d4-90b1-f6d93ad40713/data?dataType=default")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            TestDataUtil.DeleteDataForInstance("tdd", "endring-av-navn", 1000, guid);
        }


        [Fact]
        public async Task Data_Get_OK()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9")
            {
            };
            httpRequestMessage.Headers.Authorization = new AuthenticationHeaderValue("Read");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }


        private HttpClient GetTestClient()
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IInstance, InstanceMockSI>();
                    services.AddSingleton<IApplication, ApplicationMockSI>();
                    services.AddSingleton<IData, DataMockSI>();
                    services.AddTransient<IAltinnApp, App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
                });
            })
            .CreateClient();

            return client;
        }


    }
}
