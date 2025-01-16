using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class SaveRuleHandlerTests : DesignerEndpointsTestsBase<SaveRuleHandlerTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";

        public SaveRuleHandlerTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/changename/RuleHandler.js")]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/datalist/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/changename/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/datalist/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/group/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/likert/RuleHandler.js")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/message/RuleHandler.js")]
        public async Task SaveRuleHandler_ShouldCreateRuleHandlerFile_AndReturnNoContent(string org, string app, string developer, string layoutSetName, string expectedRuleHandlerPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string content = SharedResourcesHelper.LoadTestDataAsString(expectedRuleHandlerPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-handler?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(content, Encoding.UTF8)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? "App/ui/RuleHandler.js"
                : $"App/ui/{layoutSetName}/RuleHandler.js";
            Assert.Equal(TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath), content);
        }

    }
}
