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
    public class GetFormDataTests : PreviewControllerTestsBase<GetFormDataTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetFormDataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_FormData_Ok()
        {
            string expectedFormData = TestDataHelper.GetFileFromRepo(Org, AppV3, Developer, "App/models/custom-dm-name.schema.json");

            string dataPathWithData = $"{Org}/{AppV3}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormData, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_FormDataForAppWithoutDatamodel_Ok()
        {
            string dataPathWithData = $"{Org}/empty-app/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            responseBody.Should().Be($"{PartyId}/{InstanceGuId}");
        }

        [Fact]
        public async Task Get_FormDataForV4App_Ok()
        {
            string expectedFormData = TestDataHelper.GetFileFromRepo(Org, AppV4, Developer, "App/models/datamodel.schema.json");

            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet={LayoutSetName}");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormData, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_FormDataForV4AppForTaskWithoutDatamodel_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{InstanceGuId}/data/test-datatask-id";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet={LayoutSetName2}");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            responseBody.Should().Be($"{PartyId}/{InstanceGuId}");
        }
    }
}
