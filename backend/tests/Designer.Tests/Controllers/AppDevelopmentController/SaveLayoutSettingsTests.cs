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
    public class SaveLayoutSettingsTests : AppDevelopmentControllerTestsBase<SaveFormLayoutTestsBase>
    {

        public SaveLayoutSettingsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
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
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-settings?layoutSetName={layoutSetName}";

            string layoutSettings = SharedResourcesHelper.LoadTestDataAsString(layoutSettingsPath);

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(layoutSettings, Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? "App/ui/Settings.json"
                : $"App/ui/{layoutSetName}/Settings.json";
            string savedLayoutSettings = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
            JsonUtils.DeepEquals(layoutSettings, savedLayoutSettings).Should().BeTrue();
        }
    }
}
