using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class SaveRuleConfigTests : DesignerEndpointsTestsBase<SaveRuleConfigTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";

        public SaveRuleConfigTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/changename/RuleConfiguration.json")]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/group/RuleConfiguration.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/changename/RuleConfiguration.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/group/RuleConfiguration.json")]
        public async Task SaveRuleConfiguration_ShouldCreateRuleConfigurationFile_AndReturnOk(string org, string app, string developer, string layoutSetName, string expectedRuleConfigPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string content = SharedResourcesHelper.LoadTestDataAsString(expectedRuleConfigPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-config?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? "App/ui/RuleConfiguration.json"
                : $"App/ui/{layoutSetName}/RuleConfiguration.json";
            string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
            Assert.True(JsonUtils.DeepEquals(content, savedFile));
        }

    }
}
