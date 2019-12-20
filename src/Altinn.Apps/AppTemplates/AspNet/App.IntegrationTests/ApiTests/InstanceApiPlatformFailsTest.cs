using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class InstanceApiPlatformFailsTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {

        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public InstanceApiPlatformFailsTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test that verifies Get for a existing instance
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task Instance_Get_FailsOK()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "platform-fails");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/platform-fails/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task Instance_Put_FailsOK()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "platform-fails");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            Instance instance = new Instance
            {
                Id = $"1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713",
                Org = "tdd",
                AppId = "tdd/platform-fails",
                InstanceOwner = new InstanceOwner
                {
                    PartyId = "1000",
                },
            };

            StringContent httpContent = new StringContent(instance.ToString(), Encoding.UTF8, "application/json");
    
            HttpResponseMessage response = await client.PutAsync("/tdd/platform-fails/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713",
                httpContent);

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        }

        [Fact]
        public async Task Instance_Post_Instance_FailOk()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "platform-fails");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/platform-fails/instances?instanceOwnerPartyId=1000");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();           

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);            
        }
    }
}
