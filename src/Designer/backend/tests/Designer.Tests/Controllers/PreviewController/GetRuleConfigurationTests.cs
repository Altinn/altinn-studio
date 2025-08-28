using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetRuleConfigurationTests : PreviewControllerTestsBase<GetRuleConfigurationTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetRuleConfigurationTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_RuleConfiguration_Ok()
        {
            string appwithRuleConfig = "app-without-layoutsets";
            string expectedRuleConfig = TestDataHelper.GetFileFromRepo(Org, appwithRuleConfig, Developer, "App/ui/RuleConfiguration.json");

            string dataPathWithData = $"{Org}/{appwithRuleConfig}/api/resource/RuleConfiguration.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedRuleConfig, responseBody));
        }

        [Fact]
        public async Task Get_RuleConfiguration_NoContent()
        {
            string dataPathWithData = $"{Org}/{PreviewApp}/api/resource/RuleConfiguration.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }
    }
}
