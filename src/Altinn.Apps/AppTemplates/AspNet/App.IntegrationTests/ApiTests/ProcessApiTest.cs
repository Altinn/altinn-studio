using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;

using Newtonsoft.Json;
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
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new Guid("26133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/26133fb5-a9f2-45d4-90b1-f6d93ad40713/process");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstance("tdd", "endring-av-navn", 1337, new Guid("26133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            string responseContent = await response.Content.ReadAsStringAsync();
            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Proceess_GetNext_OK()
        {
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new Guid("26133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/26133fb5-a9f2-45d4-90b1-f6d93ad40713/process/next");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstance("tdd", "endring-av-navn", 1337, new Guid("26133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            string responseContent = await response.Content.ReadAsStringAsync();

            List<string> events = (List<string>)JsonConvert.DeserializeObject(responseContent, typeof(List<string>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Single(events);
        }

        [Fact]
        public async Task Proceess_Start_OK()
        {
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713/process/start");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }

        [Fact]
        public async Task Proceess_StartV2_OK()
        {
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713/process/startv2");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal("StartEvent_1", processState.StartEvent);
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }

        [Fact]
        public async Task Proceess_Start_With_Prefill_OK()
        {
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713/process/start");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // fetch instance and get data element id
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713/");
            response = await client.SendAsync(httpRequestMessage);
            Instance instance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());
            DataElement dataElement = instance.Data.First();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // fetch actual data and compare to expected prefill
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713/data/{dataElement.Id}");
            response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var skjema = JsonConvert.DeserializeObject<App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn.Skjema>(responseContent);
            Assert.Equal("01039012345", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknyttetGardNavndatadef34931.value);
            Assert.Equal("Oslo", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknyttetPersonsEtternavndatadef34930.value);
            Assert.Equal("Grev Wedels Plass", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknytningBeskrivelsedatadef34928.value);
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }

        [Fact]
        public async Task Proceess_Put_Next_OK()
        {
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1337);

            string instancePath = "/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"{instancePath}/process/start");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }

        [Fact]
        public async Task Proceess_Put_NextV2_OK()
        {
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1337);

            string instancePath = "/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"{instancePath}/process/startv2");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }

        [Fact]
        public async Task Next_RegistrationOfEventsTurnedOn_ControllerCallsEventWithCorrectType()
        {
            string org = "ttd";
            string app = "events";
            int partyId = 1337;
            string instanceGuid = "bffd2c17-9d93-49f4-b504-3d0ece2402c6";

            TestDataUtil.DeleteInstanceAndData(org, app, partyId, new Guid(instanceGuid));
            TestDataUtil.PrepareInstance(org, app, partyId, new Guid(instanceGuid));

            string token = PrincipalUtil.GetToken(partyId);

            string instancePath = $"/{org}/{app}/instances/{partyId}/{instanceGuid}";

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            if (!response.IsSuccessStatusCode)
            {
                Assert.True(false, "The next request failed.");
            }

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            TestDataUtil.DeleteInstanceAndData(org, app, partyId, new Guid(instanceGuid));
        }

        [Fact]
        public async Task Proceess_End_AfterNext_OK()
        {
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1337);

            string instancePath = "/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"{instancePath}/process/start");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/completeProcess");

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            ProcessState status = JsonConvert.DeserializeObject<ProcessState>(responseContent);

            Assert.NotNull(status.Ended);
            Assert.Null(status.CurrentTask);

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}");
            response = await client.SendAsync(httpRequestMessage);

            responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Instance resultInstance = JsonConvert.DeserializeObject<Instance>(responseContent);

            Assert.Equal(2, resultInstance.Data.Count);

            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }

        [Fact]
        public async Task Proceess_End_AfterNextV2_OK()
        {
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
            string token = PrincipalUtil.GetToken(1337);

            string instancePath = "/tdd/endring-av-navn/instances/1337/26233fb5-a9f2-45d4-90b1-f6d93ad40713";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"{instancePath}/process/startv2");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/completeProcessv2");

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            ProcessState status = JsonConvert.DeserializeObject<ProcessState>(responseContent);

            Assert.NotNull(status.Ended);
            Assert.Null(status.CurrentTask);

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}");
            response = await client.SendAsync(httpRequestMessage);

            responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Instance resultInstance = JsonConvert.DeserializeObject<Instance>(responseContent);

            Assert.Equal(2, resultInstance.Data.Count);

            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, new System.Guid("26233fb5-a9f2-45d4-90b1-f6d93ad40713"));
        }
    }
}
