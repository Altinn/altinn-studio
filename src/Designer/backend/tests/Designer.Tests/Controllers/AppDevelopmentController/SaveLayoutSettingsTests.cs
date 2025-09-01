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
    public class SaveLayoutSettingsTests : DesignerEndpointsTestsBase<SaveLayoutSettingsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";

        public SaveLayoutSettingsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        /// It's not working if the ui directory is not present in the repo.
        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/changename/Settings.json")]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/datalist/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/changename/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/datalist/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/group/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/likert/Settings.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/message/Settings.json")]
        public async Task SaveLayoutSettings_ReturnsOk(string org, string app, string developer, string layoutSetName, string layoutSettingsPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-settings?layoutSetName={layoutSetName}";

            string layoutSettings = SharedResourcesHelper.LoadTestDataAsString(layoutSettingsPath);

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(layoutSettings, Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? "App/ui/Settings.json"
                : $"App/ui/{layoutSetName}/Settings.json";
            string savedLayoutSettings = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
            Assert.True(JsonUtils.DeepEquals(layoutSettings, savedLayoutSettings));
        }
    }
}
