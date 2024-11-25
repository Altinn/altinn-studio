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
    public class InstanceForNextTaskTests : PreviewControllerTestsBase<InstanceForNextTaskTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public InstanceForNextTaskTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_InstanceForNextProcess_Ok()
        {
            Instance instance = await createInstance();
            string dataPathWithData = $"{Org}/{AppV3}/instances/{PartyId}/{instance.Id}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance responseInstance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal(instance.Id, responseInstance.Id);
            Assert.Equal(Org, responseInstance.Org);
        }

        [Fact]
        public async Task Get_InstanceForNextTaskForV4App_Ok_TaskIsIncreased()
        {
            Instance instance = await createInstance();
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet={LayoutSetName}");

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
