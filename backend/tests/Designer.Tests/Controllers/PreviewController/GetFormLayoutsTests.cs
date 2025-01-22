using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetFormLayoutsTests : PreviewControllerTestsBase<GetFormLayoutsTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetFormLayoutsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_FormLayouts_Ok()
        {
            string expectedFormLayout = TestDataHelper.GetFileFromRepo(Org, PreviewApp, Developer, "App/ui/layouts/layout.json");
            string expectedFormLayouts = @"{""layout"": " + expectedFormLayout + "}";

            string dataPathWithData = $"{Org}/{PreviewApp}/api/resource/FormLayout.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedFormLayouts, responseBody));
        }
    }
}
