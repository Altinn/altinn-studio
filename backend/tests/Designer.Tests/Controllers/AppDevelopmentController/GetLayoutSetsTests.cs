using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetLayoutSetsTests : DisagnerEndpointsTestsBase<GetLayoutSetsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        public GetLayoutSetsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/layout-sets.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, null)]
        public async Task GetLayoutSets_ShouldReturnLayoutSets(string org, string app, string developer, string layoutSetName, string expectedLayoutPaths)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedLayoutSets = string.IsNullOrEmpty(layoutSetName) ? null : await AddLayoutSetsToRepo(TestRepoPath, expectedLayoutPaths);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-sets";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = string.IsNullOrEmpty(layoutSetName) ? null : await response.Content.ReadAsStringAsync();
            if (string.IsNullOrEmpty(layoutSetName))
            {
                responseContent.Should().BeNull();
            }
            else
            {
                JsonUtils.DeepEquals(expectedLayoutSets, responseContent).Should().BeTrue();
            }
        }

        [Theory(Skip = "If App/ui is not present in repo, the controller returns 500")]
        [InlineData("ttd", "empty-app", "layoutSet1")]
        [InlineData("ttd", "empty-app", null)]
        public async Task GetLayoutSettings_IfNotExists_Should_AndReturnNotFound(string org, string app, string layoutSetName)
        {
            string url = $"{VersionPrefix(org, app)}/layout-settings?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        private async Task<string> AddLayoutSetsToRepo(string createdFolderPath, string expectedLayoutSetsPath)
        {
            string layoutSets = SharedResourcesHelper.LoadTestDataAsString(expectedLayoutSetsPath);
            string filePath = Path.Combine(createdFolderPath, "App", "ui", "layout-sets.json");
            await File.WriteAllTextAsync(filePath, layoutSets);
            return layoutSets;
        }

    }
}
