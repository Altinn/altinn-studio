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
    public class GetRuleConfigurationStatefulTests : PreviewControllerTestsBase<GetRuleConfigurationStatefulTests>
    {

        public GetRuleConfigurationStatefulTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_RuleConfigurationForStatefulAppWithoutRuleConfig_NoContent()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/api/ruleconfiguration/{LayoutSetName}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task Get_RuleConfigurationForStatefulAppWithRuleConfig_Ok()
        {
            string expectedRuleConfig = TestDataHelper.GetFileFromRepo(Org, StatefulApp, Developer, $"App/ui/{LayoutSetName2}/RuleConfiguration.json");

            string dataPathWithData = $"{Org}/{StatefulApp}/api/ruleconfiguration/{LayoutSetName2}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedRuleConfig, responseBody).Should().BeTrue();
        }
    }
}
