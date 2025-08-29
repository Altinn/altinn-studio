using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class ProcessNextTests(WebApplicationFactory<Program> factory)
        : PreviewControllerTestsBase<ProcessNextTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        [Fact]
        public async Task Get_ProcessNext_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV3Path}/instances/{PartyId}/{V3InstanceId}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3Path}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal(TaskId, processState.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Get_ProcessNextForV4App_Ok()
        {
            Instance instance = await CreateInstance();
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ProcessState processState = JsonConvert.DeserializeObject<ProcessState>(responseDocument.RootElement.ToString());
            Assert.Equal("data", processState.CurrentTask.AltinnTaskType);
            Assert.Equal(TaskId, processState.CurrentTask.ElementId);
        }
    }
}
