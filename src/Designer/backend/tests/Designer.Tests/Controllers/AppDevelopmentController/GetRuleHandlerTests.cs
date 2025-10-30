#nullable disable
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetRuleHandlerTests : DesignerEndpointsTestsBase<GetRuleHandlerTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        public GetRuleHandlerTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/changename/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/changename/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/datalist/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/group/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/likert/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/message/RuleHandler.js")]
        public async Task GetRuleHandler_ShouldReturnJsContent(string org, string app, string developer, string layoutSetName, string expectedRuleLayoutPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedRuleHandler = await AddRuleHandler(TestRepoPath, layoutSetName, expectedRuleLayoutPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-handler?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(expectedRuleHandler, responseContent);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "layoutSet1")]
        [InlineData("ttd", "empty-app", null)]
        public async Task GetRuleHandler_IfNotExists_Should_AndReturnNotFound(string org, string app, string layoutSetName)
        {
            string url = $"{VersionPrefix(org, app)}/rule-handler?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        private static async Task<string> AddRuleHandler(string createdFolderPath, string layoutSetName, string expectedRuleHandlerPath)
        {
            string ruleHandler = SharedResourcesHelper.LoadTestDataAsString(expectedRuleHandlerPath);
            string filePath = string.IsNullOrEmpty(layoutSetName) ? Path.Combine(createdFolderPath, "App", "ui", "RuleHandler.js") : Path.Combine(createdFolderPath, "App", "ui", layoutSetName, "RuleHandler.js");
            await File.WriteAllTextAsync(filePath, ruleHandler);
            return ruleHandler;
        }
    }
}
