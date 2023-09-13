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
    public class GetRuleConfigurationTests : PreviewControllerTestsBase<GetRuleConfigurationTests>
    {

        public GetRuleConfigurationTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_RuleConfiguration_Ok()
        {
            string appwithRuleConfig = "app-without-layoutsets";
            string expectedRuleConfig = TestDataHelper.GetFileFromRepo(Org, appwithRuleConfig, Developer, "App/ui/RuleConfiguration.json");

            string dataPathWithData = $"{Org}/{appwithRuleConfig}/api/resource/RuleConfiguration.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedRuleConfig, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_RuleConfiguration_NoContent()
        {
            string dataPathWithData = $"{Org}/{App}/api/resource/RuleConfiguration.json";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }
    }
}
