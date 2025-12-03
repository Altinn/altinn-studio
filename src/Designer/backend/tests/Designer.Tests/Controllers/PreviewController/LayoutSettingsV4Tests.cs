using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class LayoutSettingsV4Tests : PreviewControllerTestsBase<LayoutSettingsV4Tests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public LayoutSettingsV4Tests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_LayoutSettingsForV4Apps_Ok()
        {
            string expectedLayoutSettings = TestDataHelper.GetFileFromRepo(Org, AppV4, Developer, $"App/ui/{LayoutSetName}/Settings.json");

            string dataPathWithData = $"{Org}/{AppV4}/api/layoutsettings/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedLayoutSettings, responseBody));
        }

    }
}
