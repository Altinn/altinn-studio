using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using JetBrains.Annotations;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class DeleteFormLayoutTests : DesignerEndpointsTestsBase<DeleteFormLayoutTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        public DeleteFormLayoutTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "layoutFile1InSet1")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "layoutFile1")]
        public async Task DeleteFormLayout_ShouldDeleteLayoutFile_AndReturnOk(string org, string app, string developer, [CanBeNull] string layoutSetName, string layoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{layoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{layoutName}.json";
            string layoutFilePath = Path.Combine(TestRepoPath, relativePath);
            Assert.False(File.Exists(layoutFilePath));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "nonExistingLayoutFile")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "nonExistingLayoutFile")]
        public async Task DeleteFormLayout_NonExistingFile_Should_AndReturnNotFound(string org, string app, string developer, string layoutSetName, string layoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "testUser", "layout", "Side2")]
        public async Task DeleteFormLayout_DeletesAssociatedSummary2Components_ReturnsOk(string org, string developer, string layoutSetName, string layoutName)
        {
            string actualApp = "app-with-summary2-components";
            string app = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, actualApp, developer, app);

            string url = $"{VersionPrefix(org, app)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string expectedApp = "app-with-summary2-components-after-deleting-references";

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
    }
}
