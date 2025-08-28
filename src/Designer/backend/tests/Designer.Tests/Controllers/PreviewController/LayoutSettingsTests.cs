using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class LayoutSettingsTests(
            WebApplicationFactory<Program> factory
    ) : PreviewControllerTestsBase<LayoutSettingsTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        [Fact]
        public async Task Get_LayoutSettings_Ok()
        {
            string expectedLayoutSettings = TestDataHelper.GetFileFromRepo(Org, AppV3, Developer, "App/ui/Settings.json");

            string dataPathWithData = $"{Org}/{AppV3}/api/layoutsettings";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV3}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedLayoutSettings, responseBody));
        }
    }
}
