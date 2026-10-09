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
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController;

/// <summary>
/// Git does not store empty folders, so a layout set whose last page was deleted has no layouts folder
/// after a fresh clone. Such a layout set must still open and take a new first page. A layout set whose
/// folder is gone, on the other hand, must be reported as not found rather than recreated.
/// </summary>
public class EmptyAndMissingLayoutSetTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<EmptyAndMissingLayoutSetTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string AppWithLayoutSets = "app-with-layoutsets";
    private const string AppWithLayoutSetsV9 = "app-with-layoutsets-v9";
    private const string AppWithoutLayoutSets = "app-without-layoutsets";
    private const string LayoutSetV8 = "layoutSet1";
    private const string LayoutSetV9 = "Task_1";
    private const string NewPage = "NewPage";

    [Theory]
    [InlineData(AppWithLayoutSets, LayoutSetV8)]
    [InlineData(AppWithLayoutSetsV9, LayoutSetV9)]
    public async Task GetFormLayouts_LayoutSetWithoutLayoutsFolder_ReturnsNoPages(string app, string layoutSetName)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, app, Developer, targetRepository);
        RemoveAllPages(layoutSetName);

        // Act
        using HttpResponseMessage response = await GetFormLayouts(targetRepository, layoutSetName);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await ReadJsonObject(response));
    }

    [Theory]
    [InlineData(AppWithLayoutSets, LayoutSetV8)]
    [InlineData(AppWithLayoutSetsV9, LayoutSetV9)]
    public async Task CreatePage_LayoutSetWithoutLayoutsFolder_CreatesTheFirstPage(string app, string layoutSetName)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, app, Developer, targetRepository);
        RemoveAllPages(layoutSetName);

        // Act
        using HttpResponseMessage response = await CreatePage(targetRepository, layoutSetName, NewPage);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.True(File.Exists(Path.Combine(LayoutSetDirectory(layoutSetName), "layouts", $"{NewPage}.json")));
        Assert.Equal([NewPage], ReadPageOrder(layoutSetName));
        using HttpResponseMessage formLayoutsResponse = await GetFormLayouts(targetRepository, layoutSetName);
        Assert.Equal(HttpStatusCode.OK, formLayoutsResponse.StatusCode);
        Assert.Equal([NewPage], (await ReadJsonObject(formLayoutsResponse)).Select(layout => layout.Key));
    }

    [Fact]
    public async Task GetFormLayouts_LayoutSetFolderIsMissing_ReturnsNotFoundAndDoesNotRecreateIt()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLayoutSetsV9, Developer, targetRepository);
        Directory.Delete(LayoutSetDirectory(LayoutSetV9), true);

        // Act
        using HttpResponseMessage response = await GetFormLayouts(targetRepository, LayoutSetV9);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.False(Directory.Exists(LayoutSetDirectory(LayoutSetV9)));
    }

    [Fact]
    public async Task GetFormLayouts_LayoutSetNameDiffersInCaseFromTheFolder_ReturnsNotFound()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLayoutSetsV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await GetFormLayouts(targetRepository, LayoutSetV9.ToLowerInvariant());

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetFormLayouts_AppWithoutLayoutSetsAndWithoutLayoutsFolder_ReturnsNoPages()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithoutLayoutSets, Developer, targetRepository);
        Directory.Delete(Path.Combine(TestRepoPath, "App", "ui", "layouts"), true);

        // Act
        using HttpResponseMessage response = await GetFormLayouts(targetRepository, null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await ReadJsonObject(response));
    }

    /// <summary>
    /// Leaves the layout set as a fresh clone has it once its last page is deleted: the page order is
    /// empty, and the layouts folder is gone because Git does not store empty folders.
    /// </summary>
    /// <param name="layoutSetName">The name of the layout set to empty.</param>
    private void RemoveAllPages(string layoutSetName)
    {
        string settingsPath = Path.Combine(LayoutSetDirectory(layoutSetName), "Settings.json");
        JsonNode settings = JsonNode.Parse(File.ReadAllText(settingsPath));
        settings["pages"]["order"] = new JsonArray();
        File.WriteAllText(settingsPath, settings.ToJsonString());
        Directory.Delete(Path.Combine(LayoutSetDirectory(layoutSetName), "layouts"), true);
    }

    private string[] ReadPageOrder(string layoutSetName)
    {
        string settingsPath = Path.Combine(LayoutSetDirectory(layoutSetName), "Settings.json");
        JsonNode settings = JsonNode.Parse(File.ReadAllText(settingsPath));
        return [.. settings["pages"]["order"].AsArray().Select(page => (string)page)];
    }

    private string LayoutSetDirectory(string layoutSetName) => Path.Combine(TestRepoPath, "App", "ui", layoutSetName);

    private static async Task<JsonObject> ReadJsonObject(HttpResponseMessage response) =>
        JsonNode.Parse(await response.Content.ReadAsStringAsync()).AsObject();

    private async Task<HttpResponseMessage> GetFormLayouts(string repository, string layoutSetName)
    {
        string url = $"/designer/api/{Org}/{repository}/app-development/form-layouts";
        if (layoutSetName is not null)
        {
            url += $"?layoutSetName={layoutSetName}";
        }
        return await HttpClient.GetAsync(url);
    }

    private async Task<HttpResponseMessage> CreatePage(string repository, string layoutSetName, string pageId)
    {
        JsonObject payload = new() { ["id"] = pageId };
        using HttpRequestMessage httpRequestMessage = new(
            HttpMethod.Post,
            $"/designer/api/{Org}/{repository}/layouts/layoutSet/{layoutSetName}/pages"
        )
        {
            Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }
}
