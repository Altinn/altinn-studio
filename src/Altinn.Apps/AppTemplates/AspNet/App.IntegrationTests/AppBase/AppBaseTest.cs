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
        public async void OnInstantiation_ProcessIsStarted()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");

            Instance instance = await CreateInstance();

            // 1) Assert that process is started.
            Assert.NotNull(instance.Process);
            Assert.NotNull(instance.Process.Started);

            // 2) Get process state from instance (should be the same as returned in 1)
            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseC = await response.Content.ReadAsStringAsync();

            DeleteInstance(instance);

            response.EnsureSuccessStatusCode();

            ProcessState process = JsonConvert.DeserializeObject<ProcessState>(responseC);

            // check process state and that we are in Task_1
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(process.Started);
            Assert.NotNull(process.CurrentTask);
            Assert.Equal("Task_1", process.CurrentTask.ElementId);
        }


        [Fact]
        public async void OnTaskStart_DataElementIsCreated()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");

            Instance instance = await CreateInstance();

            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Instance instanceWData = JsonConvert.DeserializeObject<Instance>(responseContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(instanceWData.Data);

            DeleteInstance(instance);
        }

        [Fact]
        public async void OnTaskEnd_DataElementIsLocked()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");

            Instance instance = await CreateInstance();

            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            DeleteInstance(instance);

            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.NotNull(processState.Ended);

            DeleteInstance(instance);
        }

        [Fact]
        public async void OnProcessEnd_InstanceIsArchived()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);


            Instance instance = await CreateInstance();
            string instancePath = $"/tdd/endring-av-navn/instances/{instance.Id}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/completeProcess");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.NotNull(processState.Ended);

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}");
            response = await client.SendAsync(httpRequestMessage);

            Instance archivedInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(archivedInstance);
            Assert.NotNull(archivedInstance.Status.Archived);

            DeleteInstance(instance);
        }

        private async Task<Instance> CreateInstance()
        {
            string token = PrincipalUtil.GetToken(1337);

            Instance instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = "1337",
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

        private void DeleteInstance(Instance instance)
        {
            TestDataUtil.DeletInstanceAndData(instance.Org, instance.AppId.Split("/")[1], int.Parse(instance.InstanceOwner.PartyId), Guid.Parse(instance.Id.Split('/')[1]));
        }

    }
}
