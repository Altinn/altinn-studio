using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetRuleConfigTests : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {
        public GetRuleConfigTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/changename/RuleConfiguration.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/group/RuleConfiguration.json")]
        public async Task GetRuleConfig_ShouldReturnOK(string org, string app, string developer, string expectedRuleConfigPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedLayoutSettings = await AddRuleConfigToRepo(CreatedFolderPath, expectedRuleConfigPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-config";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedLayoutSettings, responseContent).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "empty-app")]
        public async Task GetRuleConfig_WhenNotExists_ReturnsOK(string org, string app)
        {
            string url = $"{VersionPrefix(org, app)}/rule-config";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Endpoint should be changed asap to return a 404 or something else than OK. Returning custom sentence content as status is not a good idea.
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseContent = await response.Content.ReadAsStringAsync();
            responseContent.Should().Be("Rule configuration not found.");
        }

        private async Task<string> AddRuleConfigToRepo(string createdFolderPath, string expectedLayoutPath)
        {
            string ruleConfig = SharedResourcesHelper.LoadTestDataAsString(expectedLayoutPath);
            string filePath = Path.Combine(createdFolderPath, "App", "ui", "RuleConfiguration.json");
            await File.WriteAllTextAsync(filePath, ruleConfig);
            return ruleConfig;
        }
    }
}
