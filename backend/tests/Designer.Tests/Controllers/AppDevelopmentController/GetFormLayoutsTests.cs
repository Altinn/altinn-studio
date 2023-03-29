using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetFormLayoutsTestsBase : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {
        public GetFormLayoutsTestsBase(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser",
            "TestData/FormLayout/layoutWithUnknownProperties.json",
            "TestData/FormLayout/changename/layouts/form.json",
            "TestData/FormLayout/changename/layouts/summary.json",
            "TestData/FormLayout/datalist/layouts/formLayout.json",
            "TestData/FormLayout/datalist/layouts/summary.json",
            "TestData/FormLayout/group/layouts/hide.json",
            "TestData/FormLayout/group/layouts/prefill.json",
            "TestData/FormLayout/group/layouts/repeating.json",
            "TestData/FormLayout/group/layouts/summary.json",
            "TestData/FormLayout/likert/layouts/formLayout.json",
            "TestData/FormLayout/message/layouts/formLayout.json")]
        public async Task GetAppDevelopment_ShouldReturnLayouts(string org, string app, string developer, params string[] expectedLayoutPaths)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            Dictionary<string, string> expectedLayouts = await AddLayoutsToRepo(CreatedFolderPath, expectedLayoutPaths);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layouts";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonNode.Parse(responseContent);

            foreach ((string expectedLayoutName, string expectedLayout) in expectedLayouts)
            {
                string actualLayout = responseJson[Path.GetFileNameWithoutExtension(expectedLayoutName)].ToJsonString();
                JsonAssertionUtils.DeepEquals(expectedLayout, actualLayout).Should().BeTrue();
            }
        }

        private static async Task<Dictionary<string, string>> AddLayoutsToRepo(string reppPath, string[] expectedLayoutPaths)
        {
            Dictionary<string, string> expectedLayouts = new Dictionary<string, string>();
            foreach (string layoutPath in expectedLayoutPaths)
            {
                string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);
                string layoutName = $"{Guid.NewGuid()}{Path.GetFileNameWithoutExtension(layoutPath)}";
                string layoutFolder = Path.Combine(reppPath, "App", "ui", "layouts");
                Directory.CreateDirectory(layoutFolder);
                string layoutFilePath = Path.Combine(layoutFolder, $"{layoutName}.json");
                await File.WriteAllTextAsync(layoutFilePath, layout);
                expectedLayouts.Add(layoutName, layout);
            }
            return expectedLayouts;
        }
    }
}
