using System.Collections.Generic;
using System.IO;
using System.Linq;
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
    public class UpdateFormLayoutNameTests : DesignerEndpointsTestsBase<UpdateFormLayoutNameTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        public UpdateFormLayoutNameTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "layoutFile1InSet1", "newLayoutName")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "layoutFile1", "newLayoutName")]
        public async Task UpdateFormLayoutName_Change_FileName_And_ReturnsOk(string org, string app, string developer, string layoutSetName, string layoutName, string newLayoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout-name/{layoutName}?layoutSetName={layoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                // This is something that should be changed in controller. The controller should not expect a string in quotes.
                // And if endpoint is expecting "application/json" media type, json file should be sent.
                Content = new StringContent($"\"{newLayoutName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string relativeOldLayoutPath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{layoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{layoutName}.json";
            string relativeNewLayoutPath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{newLayoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{newLayoutName}.json";
            string oldLayoutPath = Path.Combine(TestRepoPath, relativeOldLayoutPath);
            string newLayoutPath = Path.Combine(TestRepoPath, relativeNewLayoutPath);
            Assert.False(File.Exists(oldLayoutPath));
            Assert.True(File.Exists(newLayoutPath));
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "nonExistingLayoutName", "newLayoutName")]
        public async Task UpdateFormLayoutName_NonExistingName_ShouldReturnNotFound(string org, string app, string developer, string layoutName, string newLayoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout-name/{layoutName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent($"\"{newLayoutName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "testUser", "layout", "Side2", "Side2-new")]
        public async Task UpdateFormLayoutName_UpdatesAssociatedSummary2Components_ReturnsOk(string org, string developer, string layoutSetName, string layoutName, string newLayoutName)
        {
            string actualApp = "app-with-summary2-components";
            string app = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, actualApp, developer, app);

            string url = $"{VersionPrefix(org, app)}/form-layout-name/{layoutName}?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent($"\"{newLayoutName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string expectedApp = "app-with-summary2-components-after-updating-references";

            string[] layoutPaths = [
                "layout/layouts/Side1.json",
                "layout/layouts/Side2.json",
                "layout2/layouts/Side1.json",
                "layout2/layouts/Side2.json",
            ];

            layoutPaths.ToList().ForEach(file =>
            {
                string actual = TestDataHelper.GetFileFromRepo(org, app, developer, $"App/ui/{file}");
                string expected = TestDataHelper.GetFileFromRepo(org, expectedApp, developer, $"App/ui/{file}");
                Assert.True(JsonUtils.DeepEquals(actual, expected));
            });
        }

        [Fact]
        public async Task UpdateFormLayoutName_CaseOnlyRenameWithSetName_ShouldReturnOkAndRenameFile()
        {
            string layoutSetName = "layoutSet1";
            string layoutName = "page1";
            string newLayoutName = "PAGE1";
            string actualApp = "app-with-summary2-components";
            string app = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", actualApp, "testUser", app);


            string url = $"{VersionPrefix("ttd", app)}/form-layout-name/{layoutName}?layoutSetName={layoutSetName}";
            string oldLayoutPath = Path.Join(TestRepoPath, "App", "ui", layoutSetName, "layouts", $"{layoutName}.json");
            string newLayoutPath = Path.Join(TestRepoPath, "App", "ui", layoutSetName, "layouts", $"{newLayoutName}.json");

            Directory.CreateDirectory(Path.GetDirectoryName(oldLayoutPath));
            await File.WriteAllTextAsync(oldLayoutPath, "{}");

            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent($"\"{newLayoutName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using HttpResponseMessage response = await HttpClient.SendAsync(request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            List<string> list = [.. Directory.GetFiles(Path.GetDirectoryName(oldLayoutPath))];
            Assert.DoesNotContain(oldLayoutPath, list);
            Assert.Contains(newLayoutPath, list);
        }
    }
}
