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
    public class LayoutSettingsTests : PreviewControllerTestsBase<LayoutSettingsTests>
    {
        public LayoutSettingsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_LayoutSettings_Ok()
        {
            string expectedLayoutSettings = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/ui/Settings.json");

            string dataPathWithData = $"{Org}/{App}/api/layoutsettings";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedLayoutSettings, responseBody).Should().BeTrue();
        }
    }
}
