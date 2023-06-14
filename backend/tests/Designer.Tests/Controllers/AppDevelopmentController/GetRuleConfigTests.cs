using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetRuleConfigTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.AppDevelopmentController,GetFormLayoutsTestsBase>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        public GetRuleConfigTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/changename/RuleConfiguration.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/changename/RuleConfiguration.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/group/RuleConfiguration.json")]
        public async Task GetRuleConfig_ShouldReturnOK(string org, string app, string developer, string layoutSetName, string expectedRuleConfigPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedRuleConfig = await AddRuleConfigToRepo(CreatedFolderPath, layoutSetName, expectedRuleConfigPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-config?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedRuleConfig, responseContent).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "empty-app", null)]
        public async Task GetRuleConfig_WhenNotExists_ReturnsNotFound(string org, string app, string layoutSetName)
        {
            string url = $"{VersionPrefix(org, app)}/rule-config?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Theory]
        [InlineData("ttd", "invalid-texts-and-ruleconfig", "testUser", null)]
        public async Task GetRuleConfig_WhenFileMissesDataOnRoot_ReturnsFixedFile(string org, string app, string developer, string layoutSetName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedRuleConfigPath = "TestData/App/ui/changename/RuleConfiguration.json";
            string expectedRuleConfig = await AddRuleConfigToRepo(CreatedFolderPath, layoutSetName, expectedRuleConfigPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-config?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedRuleConfig, responseContent).Should().BeTrue();
        }

        private async Task<string> AddRuleConfigToRepo(string createdFolderPath, string layoutSetName, string expectedLayoutPath)
        {
            string ruleConfig = SharedResourcesHelper.LoadTestDataAsString(expectedLayoutPath);
            string filePath = string.IsNullOrEmpty(layoutSetName) ? Path.Combine(createdFolderPath, "App", "ui", "RuleConfiguration.json") : Path.Combine(createdFolderPath, "App", "ui", layoutSetName, "RuleConfiguration.json");
            await File.WriteAllTextAsync(filePath, ruleConfig);
            return ruleConfig;
        }
    }
}
