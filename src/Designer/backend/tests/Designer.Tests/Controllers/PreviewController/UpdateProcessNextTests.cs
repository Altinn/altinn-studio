#nullable disable
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
    public class UpdateProcessNextTests : PreviewControllerTestsBase<UpdateProcessNextTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public UpdateProcessNextTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Put_ProcessNext_Ok()
        {
            Instance instance = await CreateInstance();
            string dataPathWithData = $"{Org}/{AppV3Path}/instances/{PartyId}/{instance.Id}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3Path}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Put_ProcessNextForV4AppForNonExistingTask_Ok()
        {
            Instance instance = await CreateInstance();
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/process/next";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

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
