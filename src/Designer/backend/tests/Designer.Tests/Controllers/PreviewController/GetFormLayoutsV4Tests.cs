using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetFormLayoutsV4Tests : PreviewControllerTestsBase<GetFormLayoutsV4Tests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetFormLayoutsV4Tests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_FormLayoutsForV4App_Ok()
        {
            string expectedFormLayout1 = TestDataHelper.GetFileFromRepo(Org, AppV4, Developer, $"App/ui/{LayoutSetName}/layouts/layoutFile1InSet1.json");
            string expectedFormLayout2 = TestDataHelper.GetFileFromRepo(Org, AppV4, Developer, $"App/ui/{LayoutSetName}/layouts/layoutFile2InSet1.json");
            string expectedFormLayouts = "{\"layoutFile1InSet1\":" + expectedFormLayout1 + ",\"layoutFile2InSet1\":" + expectedFormLayout2 + "}";

            string dataPathWithData = $"{Org}/{AppV4}/api/layouts/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedFormLayouts, responseBody));
        }
    }
}
