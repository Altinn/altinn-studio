using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetFormDataTests : PreviewControllerTestsBase<GetFormDataTests>
    {

        public GetFormDataTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_FormData_Ok()
        {
            string expectedFormData = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/models/custom-dm-name.schema.json");

            string dataPathWithData = $"{Org}/{App}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormData, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_FormDataForAppWithoutDatamodel_Ok()
        {
            string dataPathWithData = $"{Org}/empty-app/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={App}&selectedLayoutSetInEditor=");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            responseBody.Should().Be($"{PartyId}/{InstanceGuId}");
        }

        [Fact]
        public async Task Get_FormDataForStatefulApp_Ok()
        {
            string expectedFormData = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, "App/models/datamodel.schema.json");

            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormData, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_FormDataForStatefulAppForTaskWithoutDatamodel_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={StatefulApp}&selectedLayoutSetInEditor={LayoutSetName2}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            responseBody.Should().Be($"{PartyId}/{InstanceGuId}");
        }
    }
}
