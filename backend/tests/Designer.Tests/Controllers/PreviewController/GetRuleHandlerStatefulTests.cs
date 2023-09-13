using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetRuleHandlerStatefulTests : PreviewControllerTestsBase<GetRuleHandlerStatefulTests>
    {

        public GetRuleHandlerStatefulTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_RuleHandlerForStatefulAppWithoutRuleHandler_NoContent()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/api/rulehandler/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleHandlerForStatefulAppWithRuleHandler_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/api/rulehandler/{LayoutSetName2}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
