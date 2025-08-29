using System;
using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetOptionsTests : PreviewControllerTestsBase<GetOptionsTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetOptionsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Options_when_options_exists_Ok()
        {
            string dataPathWithData = $"{Org}/{PreviewApp}/api/options/test-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
            Assert.Equal(@"[{""label"":""label1"",""value"":""value1""},{""label"":""label2"",""value"":""value2""}]", responseStringWithoutWhitespaces);
        }

        [Fact]
        public async Task Get_Options_when_options_exists_for_v4_app_Ok()
        {
            Instance instance = await CreateInstance();
            string dataPathWithData = $"{Org}/{AppV4}/instances/{PartyId}/{instance.Id}/options/test-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
            Assert.Equal(@"[{""label"":""label1"",""value"":""value1""},{""label"":""label2"",""value"":""value2""}]", responseStringWithoutWhitespaces);
        }

        [Fact]
        public async Task Get_Options_when_no_options_exist_returns_Ok_empty_list()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/options/non-existing-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Equal("[]", responseBody);
        }
    }
}
