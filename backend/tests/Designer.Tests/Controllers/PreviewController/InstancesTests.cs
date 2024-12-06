using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class InstancesTests : PreviewControllerTestsBase<InstancesTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public InstancesTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Post_Instance_Ok()
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(Org, AppV3, Developer, targetRepository);

            string dataPathWithData = $"{Org}/{targetRepository}/instances?instanceOwnerPartyId=51001";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal("test-datatask-id", instance.Data[0].Id);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Post_InstanceForV4App_Ok()
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(Org, AppV4, Developer, targetRepository);

            string dataPathWithData = $"{Org}/{targetRepository}/instances?instanceOwnerPartyId=51001";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal("test-datatask-id", instance.Data[0].Id);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
        }

        [Fact]
        public async Task Post_InstanceForCustomReceipt_Ok()
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(Org, AppV4, Developer, targetRepository);

            string dataPathWithData = $"{Org}/{targetRepository}/instances?instanceOwnerPartyId=51001";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet={CustomReceiptLayoutSetName}");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseDocument.RootElement.ToString());
            Assert.Equal(CustomReceiptDataType, instance.Data[0].DataType);
            Assert.Equal("EndEvent_1", instance.Process.EndEvent);
            instance.Process.CurrentTask.Should().BeNull();
        }
    }
}
