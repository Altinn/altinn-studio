using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace App.IntegrationTestsRef.AppBase
{
    public class AppBaseTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public AppBaseTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public void OnInstantiation_ProcessIsStarted()
        {
            throw new NotImplementedException();
        }


        [Fact]
        public async void OnTaskEnd_DataElementIsLocked()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");

            Instance instance = await CreateInstance();

            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"{instancePath}/process/start")
            {
            };
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseC = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next")
            {
            };
            HttpResponseMessage response2 = await client.SendAsync(httpRequestMessage);


            string responseContent = await response2.Content.ReadAsStringAsync();

            response2.EnsureSuccessStatusCode();

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.NotNull(processState.Ended);

        }

        [Fact]
        public async void OnProcessEnd_InstanceIsArchived()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713/process/completeProcess")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));


            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("formfilling", processState.CurrentTask.ElementId);
        }

        private async Task<Instance> CreateInstance()
        {
            string token = PrincipalUtil.GetToken(1);

            Instance instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = "1000",
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

            Instance result = JsonConvert.DeserializeObject<Instance>(responseContent);

            return result;
        }

    }
}
