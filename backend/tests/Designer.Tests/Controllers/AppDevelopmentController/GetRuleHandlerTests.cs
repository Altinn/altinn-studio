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
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/changename/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/datalist/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/group/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/likert/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/message/RuleHandler.js")]
        public async Task GetRuleHandler_ShouldReturnJsContent(string org, string app, string developer, string expectedRuleLayoutPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedRuleHandler = await AddRuleHandler(CreatedFolderPath, expectedRuleLayoutPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-handler";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            expectedRuleHandler.Should().Be(responseContent);
        }

        [Theory]
        [InlineData("ttd", "empty-app")]
        public async Task GetLayoutSettings_IfNotExists_Should_AndReturnNotFound(string org, string app)
        {
            string url = $"{VersionPrefix(org, app)}/rule-handler";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string content = await response.Content.ReadAsStringAsync();
            content.Should().BeEmpty();
        }

        private static async Task<string> AddRuleHandler(string createdFolderPath, string expectedRuleHandlerPath)
        {
            string ruleHandler = SharedResourcesHelper.LoadTestDataAsString(expectedRuleHandlerPath);
            string filePath = Path.Combine(createdFolderPath, "App", "ui", "RuleHandler.js");
            await File.WriteAllTextAsync(filePath, ruleHandler);
            return ruleHandler;
        }
    }
}
