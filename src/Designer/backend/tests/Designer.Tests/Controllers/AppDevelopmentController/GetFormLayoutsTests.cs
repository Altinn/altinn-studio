#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.TestDataClasses;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetFormLayoutsTests : DesignerEndpointsTestsBase<GetFormLayoutsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        public GetFormLayoutsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [ClassData(typeof(FormLayoutsTestData))]
        public async Task GetAppDevelopment_ShouldReturnLayouts(string org, string app, string developer, string layoutSetName, params string[] expectedLayoutPaths)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            Dictionary<string, string> expectedLayouts = await AddLayoutsToRepo(TestRepoPath, layoutSetName, expectedLayoutPaths);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layouts?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonNode.Parse(responseContent);

            foreach ((string expectedLayoutName, string expectedLayout) in expectedLayouts)
            {
                string actualLayout = responseJson[Path.GetFileNameWithoutExtension(expectedLayoutName)].ToJsonString();
                Assert.True(JsonUtils.DeepEquals(expectedLayout, actualLayout));
            }
        }

        private static async Task<Dictionary<string, string>> AddLayoutsToRepo(string repoPath, string layoutSetName, string[] expectedLayoutPaths)
        {
            Dictionary<string, string> expectedLayouts = new();
            foreach (string layoutPath in expectedLayoutPaths)
            {
                string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);
                string layoutName = $"{Guid.NewGuid()}{Path.GetFileNameWithoutExtension(layoutPath)}";
                string layoutFolder = string.IsNullOrEmpty(layoutSetName) ? Path.Combine(repoPath, "App", "ui", "layouts") : Path.Combine(repoPath, "App", "ui", layoutSetName, "layouts");
                Directory.CreateDirectory(layoutFolder);
                string layoutFilePath = Path.Combine(layoutFolder, $"{layoutName}.json");
                await File.WriteAllTextAsync(layoutFilePath, layout);
                expectedLayouts.Add(layoutName, layout);
            }
            return expectedLayouts;
        }
    }
}
