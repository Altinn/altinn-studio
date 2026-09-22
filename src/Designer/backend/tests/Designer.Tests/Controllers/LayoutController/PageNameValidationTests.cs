using System;
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

namespace Designer.Tests.Controllers.LayoutController;

/// <summary>
/// A request that creates a page writes or deletes more than one file, so a page name Designer may not
/// create has to be rejected before the request touches the repository. These tests pin that a rejected
/// name leaves the layout set exactly as it was, and that an accepted name still goes through.
/// </summary>
public class PageNameValidationTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<PageNameValidationTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string AppWithPageOrder = "app-with-layoutsets-v9";
    private const string AppWithPageGroups = "app-with-groups-and-task-navigation";
    private const string LayoutSetWithPageOrder = "Task_1";
    private const string LayoutSetWithPageGroups = "form";
    private const string ExistingPageInPageOrder = "Side1";
    private const string PageNameOutsideNamingPolicy = "Bad name";
    private const string PageNameFollowingNamingPolicy = "GoodName";

    private static string LayoutSetPrefix(string repository, string layoutSetName) =>
        $"/designer/api/{Org}/{repository}/layouts/layoutSet/{layoutSetName}";

    private static string SettingsPath(string layoutSetName) => $"App/ui/{layoutSetName}/Settings.json";

    private static string LayoutPath(string layoutSetName, string pageId) =>
        $"App/ui/{layoutSetName}/layouts/{pageId}.json";

    [Fact]
    public async Task CreatePage_WhenNameIsOutsideNamingPolicy_LeavesTheLayoutSetUnchanged()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithPageOrder, Developer, targetRepository);
        string settingsBefore = GetFile(targetRepository, SettingsPath(LayoutSetWithPageOrder));
        string existingPageBefore = GetFile(
            targetRepository,
            LayoutPath(LayoutSetWithPageOrder, ExistingPageInPageOrder)
        );

        // Act
        using HttpResponseMessage response = await CreatePage(targetRepository, PageNameOutsideNamingPolicy);

        // Assert
        // The layout endpoints do not translate BadHttpRequestException into a status code of their own,
        // so a rejected name surfaces as a server error rather than a bad request. That mapping is
        // tracked separately; what matters here is that nothing in the layout set is written.
        Assert.False(response.IsSuccessStatusCode);
        Assert.False(
            FileExists(targetRepository, LayoutPath(LayoutSetWithPageOrder, PageNameOutsideNamingPolicy)),
            "The rejected page must not have a layout file."
        );
        Assert.Equal(settingsBefore, GetFile(targetRepository, SettingsPath(LayoutSetWithPageOrder)));
        Assert.Equal(
            existingPageBefore,
            GetFile(targetRepository, LayoutPath(LayoutSetWithPageOrder, ExistingPageInPageOrder))
        );
        Assert.DoesNotContain(
            "NavigationButtons",
            GetFile(targetRepository, LayoutPath(LayoutSetWithPageOrder, ExistingPageInPageOrder)),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task CreatePage_WhenNameFollowsNamingPolicy_CreatesTheLayoutFile()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithPageOrder, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await CreatePage(targetRepository, PageNameFollowingNamingPolicy);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.True(FileExists(targetRepository, LayoutPath(LayoutSetWithPageOrder, PageNameFollowingNamingPolicy)));
        Assert.Contains(
            PageNameFollowingNamingPolicy,
            GetFile(targetRepository, SettingsPath(LayoutSetWithPageOrder)),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task UpdatePageGroups_WhenAddedPageNameIsOutsideNamingPolicy_KeepsTheRemovedPage()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithPageGroups, Developer, targetRepository);
        string settingsBefore = GetFile(targetRepository, SettingsPath(LayoutSetWithPageGroups));
        (JsonObject pages, string removedPageId) = await ReplaceFirstPageInFirstGroup(
            targetRepository,
            PageNameOutsideNamingPolicy
        );

        // Act
        using HttpResponseMessage response = await UpdatePageGroups(targetRepository, pages);

        // Assert
        // The layout endpoints do not translate BadHttpRequestException into a status code of their own,
        // so a rejected name surfaces as a server error rather than a bad request. That mapping is
        // tracked separately; what matters here is that nothing in the layout set is written.
        Assert.False(response.IsSuccessStatusCode);
        Assert.True(
            FileExists(targetRepository, LayoutPath(LayoutSetWithPageGroups, removedPageId)),
            "The page the rejected request would have removed must still have its layout file."
        );
        Assert.False(FileExists(targetRepository, LayoutPath(LayoutSetWithPageGroups, PageNameOutsideNamingPolicy)));
        Assert.Equal(settingsBefore, GetFile(targetRepository, SettingsPath(LayoutSetWithPageGroups)));
    }

    [Fact]
    public async Task UpdatePageGroups_WhenAddedPageNameFollowsNamingPolicy_RemovesAndCreatesLayoutFiles()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithPageGroups, Developer, targetRepository);
        (JsonObject pages, string removedPageId) = await ReplaceFirstPageInFirstGroup(
            targetRepository,
            PageNameFollowingNamingPolicy
        );

        // Act
        using HttpResponseMessage response = await UpdatePageGroups(targetRepository, pages);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(FileExists(targetRepository, LayoutPath(LayoutSetWithPageGroups, removedPageId)));
        Assert.True(FileExists(targetRepository, LayoutPath(LayoutSetWithPageGroups, PageNameFollowingNamingPolicy)));
        string settingsAfter = GetFile(targetRepository, SettingsPath(LayoutSetWithPageGroups));
        Assert.Contains(PageNameFollowingNamingPolicy, settingsAfter, StringComparison.Ordinal);
        Assert.DoesNotContain(removedPageId, settingsAfter, StringComparison.Ordinal);
    }

    /// <summary>
    /// Reads the page groups of the layout set and swaps the first page of the first group for a page
    /// with the given name, so that the resulting request both removes an existing page and adds a new
    /// one.
    /// </summary>
    /// <param name="repository">The repository to read the page groups from.</param>
    /// <param name="addedPageId">The name of the page that replaces the first page of the first group.</param>
    /// <returns>The page groups to send back, and the name of the page that was removed from them.</returns>
    private async Task<(JsonObject Pages, string RemovedPageId)> ReplaceFirstPageInFirstGroup(
        string repository,
        string addedPageId
    )
    {
        using HttpResponseMessage response = await HttpClient.GetAsync(
            $"{LayoutSetPrefix(repository, LayoutSetWithPageGroups)}/pages"
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        JsonObject pages = JsonNode.Parse(await response.Content.ReadAsStringAsync()).AsObject();
        JsonArray firstGroupOrder = pages["groups"].AsArray()[0]["order"].AsArray();
        string removedPageId = (string)firstGroupOrder[0]["id"];
        firstGroupOrder.RemoveAt(0);
        firstGroupOrder.Add(new JsonObject { ["id"] = addedPageId });
        return (pages, removedPageId);
    }

    private async Task<HttpResponseMessage> CreatePage(string repository, string pageId)
    {
        JsonObject payload = new() { ["id"] = pageId };
        using HttpRequestMessage httpRequestMessage = new(
            HttpMethod.Post,
            $"{LayoutSetPrefix(repository, LayoutSetWithPageOrder)}/pages"
        )
        {
            Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }

    private async Task<HttpResponseMessage> UpdatePageGroups(string repository, JsonObject pages)
    {
        using HttpRequestMessage httpRequestMessage = new(
            HttpMethod.Put,
            $"{LayoutSetPrefix(repository, LayoutSetWithPageGroups)}/page-groups"
        )
        {
            Content = new StringContent(pages.ToJsonString(), Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }

    private static string GetFile(string repository, string relativePath) =>
        TestDataHelper.GetFileFromRepo(Org, repository, Developer, relativePath);

    private static bool FileExists(string repository, string relativePath) =>
        TestDataHelper.FileExistsInRepo(Org, repository, Developer, relativePath);
}
