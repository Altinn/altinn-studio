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
    public class GetLayoutSettings : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {
        public GetLayoutSettings(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        [Theory(Skip = "Content is not the same as expected. Strongly typed model should be replaces with JsonNode.")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/changename/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/datalist/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/group/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/likert/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "TestData/App/ui/message/Settings.json")]
        public async Task GetLayoutSettings_ShouldReturnLayouts(string org, string app, string developer, string expectedLayoutPaths)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedLayoutSettings = await AddLayoutSettingsToRepo(CreatedFolderPath, expectedLayoutPaths);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-settings";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedLayoutSettings, responseContent).Should().BeTrue();
        }

        [Theory(Skip = "If App/ui is not present in repo, the controller returns 500")]
        [InlineData("ttd", "empty-app", "testUser")]
        public async Task GetLayoutSettings_IfNotExists_Should_AndReturnNotFound(string org, string app, string developer)
        {
            string url = $"{VersionPrefix(org, app)}/layout-settings";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        private async Task<string> AddLayoutSettingsToRepo(string createdFolderPath, string expectedLayoutPath)
        {
            string layout = SharedResourcesHelper.LoadTestDataAsString(expectedLayoutPath);
            string filePath = Path.Combine(createdFolderPath, "App", "ui", "Settings.json");
            await File.WriteAllTextAsync(filePath, layout);
            return layout;
        }

    }
}
