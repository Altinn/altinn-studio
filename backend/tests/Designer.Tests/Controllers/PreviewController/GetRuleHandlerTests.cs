using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetRuleHandlerTests : PreviewControllerTestsBase<GetRuleHandlerTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetRuleHandlerTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_RuleHandler_NoContent()
        {
            string dataPathWithData = $"{Org}/{App}/api/resource/RuleHandler.js";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }
    }
}
