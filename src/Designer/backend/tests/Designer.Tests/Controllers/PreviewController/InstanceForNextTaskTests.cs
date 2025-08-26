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
    public class InstanceForNextTaskTests(WebApplicationFactory<Program> factory) : PreviewControllerTestsBase<InstanceForNextTaskTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        [Fact]
        public async Task Get_InstanceForNextProcess_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV3Path}/instances/{PartyId}/{V3InstanceId}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3Path}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance responseInstance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal(PartyId + "/" + V3InstanceId, responseInstance.Id);
            Assert.Equal(Org, responseInstance.Org);
        }

        [Fact]
        public async Task Get_InstanceForNextTaskForV4App_Ok_TaskIsIncreased()
        {
            Instance instance = await CreateInstance();
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance responseInstance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal(instance.Id, responseInstance.Id);
            Assert.Equal(Org, responseInstance.Org);
            Assert.Equal(TaskId, instance.Process.CurrentTask.ElementId);
        }
    }
}
