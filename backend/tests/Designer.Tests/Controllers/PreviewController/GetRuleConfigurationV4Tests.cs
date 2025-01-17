using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetRuleConfigurationV4Tests : PreviewControllerTestsBase<GetRuleConfigurationV4Tests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetRuleConfigurationV4Tests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_RuleConfigurationForV4AppWithoutRuleConfig_NoContent()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/ruleconfiguration/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleConfigurationForV4AppWithRuleConfig_Ok()
        {
            string expectedRuleConfig = TestDataHelper.GetFileFromRepo(Org, AppV4, Developer, $"App/ui/{LayoutSetName2}/RuleConfiguration.json");

            string dataPathWithData = $"{Org}/{AppV4}/api/ruleconfiguration/{LayoutSetName2}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedRuleConfig, responseBody));
        }
    }
}
