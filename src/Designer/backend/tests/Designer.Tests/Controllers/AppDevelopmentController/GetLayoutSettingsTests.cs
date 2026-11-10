using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController;

public class GetLayoutSettingsTests
    : DesignerEndpointsTestsBase<GetLayoutSettingsTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/app-development";

    public GetLayoutSettingsTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "TestData/App/ui/changename/Settings.json")]
    [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/changename/Settings.json")]
    [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/datalist/Settings.json")]
    [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/group/Settings.json")]
    [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/likert/Settings.json")]
    [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/App/ui/message/Settings.json")]
    public async Task GetLayoutSettings_ShouldReturnLayouts(
        string org,
        string app,
        string developer,
        string layoutSetName,
        string expectedLayoutPaths
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string expectedLayoutSettings = await AddLayoutSettingsToRepo(TestRepoPath, layoutSetName, expectedLayoutPaths);

        string url = $"{VersionPrefix(org, targetRepository)}/layout-settings?layoutSetName={layoutSetName}";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string responseContent = await response.Content.ReadAsStringAsync();
        Assert.True(JsonUtils.DeepEquals(expectedLayoutSettings, responseContent));
    }

    [Fact]
    public async Task GetLayoutSettings_ForRemovedTaskFolder_ReturnsNotFoundWithoutRecreatingIt()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", targetRepository);
        string removedFolder = Path.Combine(TestRepoPath, "App", "ui", "Task_1");
        Directory.Delete(removedFolder, recursive: true);

        string url = $"{VersionPrefix("ttd", targetRepository)}/layout-settings?layoutSetName=Task_1";
        using var response = await HttpClient.GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.False(Directory.Exists(removedFolder));
    }

    [Theory]
    [InlineData("ttd", "empty-app", "layoutSet1")]
    [InlineData("ttd", "empty-app", null)]
    public async Task GetLayoutSettings_IfNotExists_Should_AndReturnNotFound(
        string org,
        string app,
        string layoutSetName
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, "testUser", targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/layout-settings?layoutSetName={layoutSetName}";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task<string> AddLayoutSettingsToRepo(
        string createdFolderPath,
        string layoutSetName,
        string expectedLayoutPath
    )
    {
        string layout = SharedResourcesHelper.LoadTestDataAsString(expectedLayoutPath);
        string filePath = string.IsNullOrEmpty(layoutSetName)
            ? Path.Combine(createdFolderPath, "App", "ui", "Settings.json")
            : Path.Combine(createdFolderPath, "App", "ui", layoutSetName, "Settings.json");
        await File.WriteAllTextAsync(filePath, layout);
        return layout;
    }
}
