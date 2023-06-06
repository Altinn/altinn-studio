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
    public class GetRuleHandlerTests : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {

        public GetRuleHandlerTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
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
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedRuleHandler = await AddRuleHandler(CreatedFolderPath, layoutSetName, expectedRuleLayoutPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-handler?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            expectedRuleHandler.Should().Be(responseContent);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "layoutSet1")]
        [InlineData("ttd", "empty-app", null)]
        public async Task GetRuleHandler_IfNotExists_Should_AndReturnNotFound(string org, string app, string layoutSetName)
        {
            string url = $"{VersionPrefix(org, app)}/rule-handler?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            string content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Could not find rule handler in app.");
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
