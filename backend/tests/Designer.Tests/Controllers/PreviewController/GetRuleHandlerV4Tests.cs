using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetRuleHandlerV4Tests : PreviewControllerTestsBase<GetRuleHandlerV4Tests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetRuleHandlerV4Tests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_RuleHandlerForV4AppWithoutRuleHandler_NoContent()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/rulehandler/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleHandlerForV4AppWithRuleHandler_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/rulehandler/{LayoutSetName2}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
