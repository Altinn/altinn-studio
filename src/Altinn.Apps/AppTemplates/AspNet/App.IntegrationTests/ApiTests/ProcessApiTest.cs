using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Xunit;

namespace App.IntegrationTests.ApiTests
{
    public class ProcessApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public ProcessApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Proceess_Get_OK()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713/process")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            ProcessState processState= (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

          
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Proceess_GetNext_OK()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713/process/next")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            List<string> events = (List<string>)JsonConvert.DeserializeObject(responseContent, typeof(List<string>));


            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(1, events.Count);
        }

        [Fact]
        public async Task Proceess_Start_OK()
        {
            TestDataUtil.DeletInstanceAndData("tdd", "endring-av-navn", 1000, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1000, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1000/26233fb5-a9f2-45d4-90b1-f6d93ad40713/process/start")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
         
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            TestDataUtil.DeletInstanceAndData("tdd", "endring-av-navn", 1000, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }

        [Fact]
        public async Task Proceess_Put_Next_OK()
        {
            TestDataUtil.DeletInstanceAndData("tdd", "endring-av-navn", 1000, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1000, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1);

            string instancePath = "/tdd/endring-av-navn/instances/1000/26233fb5-a9f2-45d4-90b1-f6d93ad40713";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"{instancePath}/process/start");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");

            response = await client.SendAsync(httpRequestMessage);
            responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            TestDataUtil.DeletInstanceAndData("tdd", "endring-av-navn", 1000, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }
    }
}
