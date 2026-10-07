using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController;

public class GetLayoutNamesTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<GetLayoutNamesTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string EmptyLayout = """{ "data": { "layout": [] } }""";

    [Fact]
    public async Task GetLayoutNames_V9App_ReturnsThePagesOfEveryUiFolder()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        await File.WriteAllTextAsync(Path.Combine(UiDirectory, "Task_1", "layouts", "Side2.json"), EmptyLayout);
        string folderWithoutPages = Directory.CreateDirectory(Path.Combine(UiDirectory, "Task_2")).FullName;
        await File.WriteAllTextAsync(
            Path.Combine(folderWithoutPages, "Settings.json"),
            """{ "pages": { "order": [] } }"""
        );

        // Act
        using HttpResponseMessage response = await GetLayoutNames(targetRepository);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["Side1", "Side1", "Side2"], (await ReadLayoutNames(response)).Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task GetLayoutNames_V9AppWithoutUiFolder_ReturnsNoPages()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        Directory.Delete(UiDirectory, true);

        // Act
        using HttpResponseMessage response = await GetLayoutNames(targetRepository);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await ReadLayoutNames(response));
    }

    [Fact]
    public async Task GetLayoutNames_V8AppWithLayoutSetWithoutLayoutsFolder_ReturnsThePagesOfTheOtherLayoutSets()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets", Developer, targetRepository);
        await KeepOnlyLayoutSets("layoutSet1", "layoutSet2");
        Directory.Delete(Path.Combine(UiDirectory, "layoutSet2", "layouts"), true);

        // Act
        using HttpResponseMessage response = await GetLayoutNames(targetRepository);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            ["layoutFile1InSet1", "layoutFile2InSet1"],
            (await ReadLayoutNames(response)).Order(StringComparer.Ordinal)
        );
    }

    [Fact]
    public async Task GetLayoutNames_AppWithoutLayoutSets_ReturnsItsPages()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-without-layoutsets", Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await GetLayoutNames(targetRepository);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["layoutFile1", "layoutFile2"], (await ReadLayoutNames(response)).Order(StringComparer.Ordinal));
    }

    private string UiDirectory => Path.Combine(TestRepoPath, "App", "ui");

    /// <summary>
    /// Removes every other layout set from layout-sets.json. The test repository lists layout sets that
    /// have no folder at all, and those are reported as not found.
    /// </summary>
    /// <param name="layoutSetIds">The ids of the layout sets to keep.</param>
    private async Task KeepOnlyLayoutSets(params string[] layoutSetIds)
    {
        string layoutSetsPath = Path.Combine(UiDirectory, "layout-sets.json");
        JsonNode layoutSets = JsonNode.Parse(await File.ReadAllTextAsync(layoutSetsPath));
        layoutSets["sets"] = new JsonArray([
            .. layoutSets["sets"]
                .AsArray()
                .Where(set => layoutSetIds.Contains((string)set["id"]))
                .Select(set => set.DeepClone()),
        ]);
        await File.WriteAllTextAsync(layoutSetsPath, layoutSets.ToJsonString());
    }

    private async Task<HttpResponseMessage> GetLayoutNames(string repository) =>
        await HttpClient.GetAsync($"/designer/api/{Org}/{repository}/app-development/layout-names");

    private static async Task<string[]> ReadLayoutNames(HttpResponseMessage response) =>
        JsonSerializer.Deserialize<string[]>(await response.Content.ReadAsStringAsync());
}
