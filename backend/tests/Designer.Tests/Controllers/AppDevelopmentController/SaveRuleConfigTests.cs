using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class SaveRuleConfigTests : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {

        public SaveRuleConfigTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "TestData/App/ui/changename/RuleConfiguration.json")]
        [InlineData("ttd", "empty-app", "testUser", "TestData/App/ui/group/RuleConfiguration.json")]
        public async Task SaveRuleHandler_ShouldCreateRuleHandlerFile_AndReturnNoContent(string org, string app, string developer, string expectedRuleConfigPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string content = SharedResourcesHelper.LoadTestDataAsString(expectedRuleConfigPath);

            string url = $"{VersionPrefix(org, targetRepository)}/rule-config";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/RuleConfiguration.json");
            JsonUtils.DeepEquals(content, savedFile).Should().BeTrue();
        }

    }
}
