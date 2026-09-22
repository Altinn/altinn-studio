using System;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController;

/// <summary>
/// Designer holds the names it creates to a naming policy, but a repository may already contain names
/// that policy would not allow: a page name with a space or with dots, or a layout set folder name
/// longer than 28 characters. Those names must stay readable and editable, while a name Designer is
/// asked to create is still held to the policy.
/// </summary>
public class LayoutNameValidationTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<LayoutNameValidationTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string AppWithLegacyNames = "app-with-legacy-layout-names";
    private const string Developer = "testUser";
    private const string LayoutSetWithLegacyPageNames = "legacySet";
    private const string LayoutSetWithLongFolderName = "subform-GjennomfoeringsplanDataV7Pdf";
    private const string PageNameWithSpace = "Text field";
    private const string PageNameWithDots = "1.Intro";

    private static string AppDevelopmentPrefix(string repository) =>
        $"/designer/api/{Org}/{repository}/app-development";

    private static string UiFoldersPrefix(string repository) => $"/designer/api/{Org}/{repository}/ui-folders";

    private static string LayoutPath(string layoutSetName, string layoutName) =>
        $"App/ui/{layoutSetName}/layouts/{layoutName}.json";

    [Fact]
    public async Task GetFormLayouts_PageNamesWithSpaceAndDots_ReturnsEveryPage()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);
        string url =
            $"{AppDevelopmentPrefix(targetRepository)}/form-layouts?layoutSetName={LayoutSetWithLegacyPageNames}";

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode formLayouts = JsonNode.Parse(await response.Content.ReadAsStringAsync());
        Assert.NotNull(formLayouts[PageNameWithSpace]);
        Assert.NotNull(formLayouts[PageNameWithDots]);
        Assert.NotNull(formLayouts["Side1"]);
    }

    [Fact]
    public async Task GetFormLayouts_LayoutSetFolderNameLongerThanNamingPolicy_ReturnsThePages()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);
        string url =
            $"{AppDevelopmentPrefix(targetRepository)}/form-layouts"
            + $"?layoutSetName={Uri.EscapeDataString(LayoutSetWithLongFolderName)}";

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode formLayouts = JsonNode.Parse(await response.Content.ReadAsStringAsync());
        Assert.NotNull(formLayouts["Side1"]);
    }

    [Fact]
    public async Task GetLayoutSettings_LayoutSetFolderNameLongerThanNamingPolicy_ReturnsSettings()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);
        string url =
            $"{AppDevelopmentPrefix(targetRepository)}/layout-settings"
            + $"?layoutSetName={Uri.EscapeDataString(LayoutSetWithLongFolderName)}";

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode layoutSettings = JsonNode.Parse(await response.Content.ReadAsStringAsync());
        Assert.NotNull(layoutSettings["pages"]);
    }

    [Fact]
    public async Task GetLayoutSets_LayoutSetFolderNameLongerThanNamingPolicy_IsListed()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);
        string url = $"{UiFoldersPrefix(targetRepository)}/layout-sets";

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string responseContent = await response.Content.ReadAsStringAsync();
        Assert.Contains(LayoutSetWithLongFolderName, responseContent, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdateFormLayoutName_FromPageNameWithSpaceToAllowedName_RenamesTheFile()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);
        const string NewLayoutName = "TextField";

        // Act
        using HttpResponseMessage response = await RenamePage(targetRepository, PageNameWithSpace, NewLayoutName);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(
            TestDataHelper.FileExistsInRepo(
                Org,
                targetRepository,
                Developer,
                LayoutPath(LayoutSetWithLegacyPageNames, PageNameWithSpace)
            )
        );
        Assert.True(
            TestDataHelper.FileExistsInRepo(
                Org,
                targetRepository,
                Developer,
                LayoutPath(LayoutSetWithLegacyPageNames, NewLayoutName)
            )
        );
    }

    [Theory]
    [InlineData("New page")]
    [InlineData("new.page")]
    public async Task UpdateFormLayoutName_ToNameOutsideNamingPolicy_IsRejected(string newLayoutName)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await RenamePage(targetRepository, "Side1", newLayoutName);

        // Assert
        // The rename and save endpoints do not translate BadHttpRequestException into a status code of
        // their own, so a rejected name surfaces as a server error rather than a bad request. That
        // mapping is tracked separately; what matters here is that the write does not happen.
        Assert.False(response.IsSuccessStatusCode);
        Assert.True(
            TestDataHelper.FileExistsInRepo(
                Org,
                targetRepository,
                Developer,
                LayoutPath(LayoutSetWithLegacyPageNames, "Side1")
            )
        );
    }

    [Fact]
    public async Task UpdateFormLayoutName_ToNameLongerThanNamingPolicy_IsRejected()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);
        string newLayoutName = new('a', 129);

        // Act
        using HttpResponseMessage response = await RenamePage(targetRepository, "Side1", newLayoutName);

        // Assert
        // The rename and save endpoints do not translate BadHttpRequestException into a status code of
        // their own, so a rejected name surfaces as a server error rather than a bad request. That
        // mapping is tracked separately; what matters here is that the write does not happen.
        Assert.False(response.IsSuccessStatusCode);
        Assert.True(
            TestDataHelper.FileExistsInRepo(
                Org,
                targetRepository,
                Developer,
                LayoutPath(LayoutSetWithLegacyPageNames, "Side1")
            )
        );
    }

    [Fact]
    public async Task SaveFormLayout_ExistingPageWithSpaceInName_IsSaved()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await SavePage(targetRepository, PageNameWithSpace);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string savedLayout = TestDataHelper.GetFileFromRepo(
            Org,
            targetRepository,
            Developer,
            LayoutPath(LayoutSetWithLegacyPageNames, PageNameWithSpace)
        );
        Assert.Contains("saved-component", savedLayout, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SaveFormLayout_NewPageOutsideNamingPolicy_IsRejected()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);
        const string NewPageName = "New page";

        // Act
        using HttpResponseMessage response = await SavePage(targetRepository, NewPageName);

        // Assert
        // The rename and save endpoints do not translate BadHttpRequestException into a status code of
        // their own, so a rejected name surfaces as a server error rather than a bad request. That
        // mapping is tracked separately; what matters here is that the write does not happen.
        Assert.False(response.IsSuccessStatusCode);
        Assert.False(
            TestDataHelper.FileExistsInRepo(
                Org,
                targetRepository,
                Developer,
                LayoutPath(LayoutSetWithLegacyPageNames, NewPageName)
            )
        );
    }

    [Theory]
    [InlineData("../escaped")]
    [InlineData("nested/set")]
    [InlineData("nested\\set")]
    public async Task GetFormLayouts_LayoutSetNameEscapingTheLayoutFolder_IsRejected(string layoutSetName)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);
        string url =
            $"{AppDevelopmentPrefix(targetRepository)}/form-layouts"
            + $"?layoutSetName={Uri.EscapeDataString(layoutSetName)}";

        // Act
        using HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddLayoutSet_NameLongerThanNamingPolicy_IsRejected()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await AddLayoutSet(targetRepository, new string('a', 29));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddLayoutSet_NameOutsideNamingPolicy_IsRejected()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppWithLegacyNames, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await AddLayoutSet(targetRepository, "new set");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<HttpResponseMessage> RenamePage(string repository, string pageName, string newPageName)
    {
        string url =
            $"{AppDevelopmentPrefix(repository)}/form-layout-name/{Uri.EscapeDataString(pageName)}"
            + $"?layoutSetName={LayoutSetWithLegacyPageNames}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(newPageName),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }

    private async Task<HttpResponseMessage> SavePage(string repository, string pageName)
    {
        string url =
            $"{AppDevelopmentPrefix(repository)}/form-layout/{Uri.EscapeDataString(pageName)}"
            + $"?layoutSetName={LayoutSetWithLegacyPageNames}";
        JsonObject layout = new()
        {
            ["$schema"] = "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json",
            ["data"] = new JsonObject
            {
                ["layout"] = new JsonArray(new JsonObject { ["id"] = "saved-component", ["type"] = "Paragraph" }),
            },
        };
        JsonObject payload = new() { ["componentIdsChange"] = null, ["layout"] = layout };
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, url)
        {
            Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }

    private async Task<HttpResponseMessage> AddLayoutSet(string repository, string layoutSetId)
    {
        LayoutSetPayload payload = new()
        {
            TaskType = TaskType.Data,
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = layoutSetId, TaskId = "NewTask" },
        };
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, $"{UiFoldersPrefix(repository)}/layout-sets")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }
}
