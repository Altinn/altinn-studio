using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetFormLayoutsTests : PreviewControllerTestsBase<GetFormLayoutsTests>
    {

        public GetFormLayoutsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_FormLayouts_Ok()
        {
            string expectedFormLayout = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/ui/layouts/layout.json");
            string expectedFormLayouts = @"{""layout"": " + expectedFormLayout + "}";

            string dataPathWithData = $"{Org}/{App}/api/resource/FormLayout.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormLayouts, responseBody).Should().BeTrue();
        }
    }
}
