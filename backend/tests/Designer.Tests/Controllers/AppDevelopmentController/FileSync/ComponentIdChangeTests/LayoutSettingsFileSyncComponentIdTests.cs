using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController.FileSync.ComponentIdChangeTests;

public class LayoutSettingsFileSyncComponentIdTests : DisagnerEndpointsTestsBase<LayoutSettingsFileSyncComponentIdTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development/form-layout";

    public LayoutSettingsFileSyncComponentIdTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "confirmChangeName", "aNewComponentId")]
    // The oldComponentId is present in the array of components to exclude from PDF in Settings.json
    public async Task SaveFormLayoutWithComponentIdChanges_ShouldSyncOccurrencesInLayoutSettings(string org, string app, string developer, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo("App/ui/changename/Settings.json", $"App/ui/{layoutSetName}/Settings.json");
        string layoutName = "testLayout";
        string jsonPayload = ArrangeApiRequestContent(oldComponentId, newComponentId);

        string url = $"{VersionPrefix(org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutSettingsFromRepo = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/ui/{layoutSetName}/Settings.json");

        JsonNode layoutSettings = JsonNode.Parse(layoutSettingsFromRepo);
        JsonArray excludeFromPdfArray = layoutSettings["components"]?["excludeFromPdf"]?.AsArray();

        excludeFromPdfArray.Where(node => node.GetValue<string>() == oldComponentId).Should().BeEmpty();
        excludeFromPdfArray.Should().ContainSingle(node => node.GetValue<string>() == newComponentId);
    }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "confirmChangeName", null)]
    // The oldComponentId is present in the array of components to exclude from PDF in Settings.json
    public async Task SaveFormLayoutWithComponentIdRemoval_ShouldRemoveOccurrencesInLayoutSettings(string org, string app, string developer, string layoutSetName, string oldComponentId, string newComponentId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo("App/ui/changename/Settings.json", $"App/ui/{layoutSetName}/Settings.json");
        string layoutName = "testLayout";
        string jsonPayload = ArrangeApiRequestContent(oldComponentId, newComponentId);

        string url = $"{VersionPrefix(org, targetRepository)}/{layoutName}?layoutSetName={layoutSetName}";

        string originalLayoutSettingsString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/ui/{layoutSetName}/Settings.json");
        JsonNode originalLayoutSettings = JsonNode.Parse(originalLayoutSettingsString);
        JsonArray originalExcludeFromPdfArray = originalLayoutSettings["components"]?["excludeFromPdf"]?.AsArray();

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string layoutSettingsFromRepo = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/ui/{layoutSetName}/Settings.json");

        JsonNode layoutSettings = JsonNode.Parse(layoutSettingsFromRepo);
        JsonArray excludeFromPdfArray = layoutSettings["components"]?["excludeFromPdf"]?.AsArray();

        excludeFromPdfArray.Count.Should().Be(originalExcludeFromPdfArray.Count - 1);
        excludeFromPdfArray.Where(node => node.GetValue<string>() == oldComponentId).Should().BeEmpty();
    }

    private string ArrangeApiRequestContent(string oldComponentId, string newComponentId)
    {
        string layoutPath = "TestData/App/ui/changename/layouts/form.json";

        // Post a random layout for this test since we are checking the changes in the Settings file.
        string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);

        var payload = new JsonObject
        {
            ["componentIdChange"] = new JsonObject
            {
                ["oldComponentId"] = oldComponentId,
                ["newComponentId"] = newComponentId,
            },

            ["layout"] = JsonNode.Parse(layout)
        };

        return payload.ToJsonString();
    }

    private async Task AddFileToRepo(string fileToCopyPath, string relativeCopyRepoLocation)
    {
        string fileContent = SharedResourcesHelper.LoadTestDataAsString(fileToCopyPath);
        string filePath = Path.Combine(TestRepoPath, relativeCopyRepoLocation);
        string folderPath = Path.GetDirectoryName(filePath);
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }
        await File.WriteAllTextAsync(filePath, fileContent);
    }

}
