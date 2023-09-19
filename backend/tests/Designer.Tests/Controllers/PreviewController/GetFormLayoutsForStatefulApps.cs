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
    public class GetFormLayoutsForStatefulApps : PreviewControllerTestsBase<GetFormLayoutsForStatefulApps>
    {

        public GetFormLayoutsForStatefulApps(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_FormLayoutsForStatefulApp_Ok()
        {
            string expectedFormLayout1 = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, $"App/ui/{LayoutSetName}/layouts/layoutFile1InSet1.json");
            string expectedFormLayout2 = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, $"App/ui/{LayoutSetName}/layouts/layoutFile2InSet1.json");
            string expectedFormLayouts = "{\"layoutFile1InSet1\":" + expectedFormLayout1 + ",\"layoutFile2InSet1\":" + expectedFormLayout2 + "}";

            string dataPathWithData = $"{Org}/{StatefulApp}/api/layouts/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedFormLayouts, responseBody).Should().BeTrue();
        }
    }
}
