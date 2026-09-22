using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.UiFoldersController;

/// <summary>
/// A v9 app derives its layout sets from the folders under App/ui, and a folder may carry a name longer
/// than the 28 characters Designer allows for a name it creates. Such a layout set must still be
/// renamable and deletable, while a name Designer is asked to create is held to the naming policy.
/// </summary>
public class LayoutSetNameValidationTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<LayoutSetNameValidationTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string AppV9 = "app-with-layoutsets-v9";
    private const string Developer = "testUser";
    private const string LayoutSetWithLongFolderName = "subform-GjennomfoeringsplanDataV7Pdf";

    private static string LayoutSetsUrl(string repository) =>
        $"/designer/api/{Org}/{repository}/ui-folders/layout-sets";

    [Fact]
    public async Task DeleteLayoutSet_FolderNameLongerThanNamingPolicy_IsDeleted()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        await AddSubformLayoutSetToTestRepo(LayoutSetWithLongFolderName);
        string url = $"{LayoutSetsUrl(targetRepository)}/{Uri.EscapeDataString(LayoutSetWithLongFolderName)}";

        // Act
        using HttpResponseMessage response = await HttpClient.DeleteAsync(url);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(Directory.Exists(LayoutSetDirectory(LayoutSetWithLongFolderName)));
    }

    [Fact]
    public async Task UpdateLayoutSetName_FromFolderNameLongerThanNamingPolicy_IsRenamed()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);
        await AddSubformLayoutSetToTestRepo(LayoutSetWithLongFolderName);
        const string NewLayoutSetName = "planSubform";
        string url = $"{LayoutSetsUrl(targetRepository)}/{Uri.EscapeDataString(LayoutSetWithLongFolderName)}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(NewLayoutSetName),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(Directory.Exists(LayoutSetDirectory(LayoutSetWithLongFolderName)));
        Assert.True(Directory.Exists(LayoutSetDirectory(NewLayoutSetName)));
    }

    [Theory]
    [InlineData("new set")]
    [InlineData("new.set")]
    public async Task AddLayoutSet_NameOutsideNamingPolicy_IsRejected(string layoutSetId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await AddLayoutSet(targetRepository, layoutSetId);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddLayoutSet_NameLongerThanNamingPolicy_IsRejected()
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, AppV9, Developer, targetRepository);

        // Act
        using HttpResponseMessage response = await AddLayoutSet(targetRepository, new string('a', 29));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<HttpResponseMessage> AddLayoutSet(string repository, string layoutSetId)
    {
        LayoutSetPayload payload = new()
        {
            TaskType = TaskType.Data,
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = layoutSetId, DataType = "model" },
        };
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, LayoutSetsUrl(repository))
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }

    private string LayoutSetDirectory(string layoutSetName) => Path.Combine(TestRepoPath, "App", "ui", layoutSetName);

    private async Task AddSubformLayoutSetToTestRepo(string layoutSetName)
    {
        string layoutsDirectory = Path.Combine(LayoutSetDirectory(layoutSetName), "layouts");
        Directory.CreateDirectory(layoutsDirectory);
        await File.WriteAllTextAsync(
            Path.Combine(LayoutSetDirectory(layoutSetName), "Settings.json"),
            """
            {
                "$schema": "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json",
                "pages": { "order": ["Side1"] },
                "type": "subform",
                "defaultDataType": "subform-model"
            }
            """
        );
        await File.WriteAllTextAsync(
            Path.Combine(layoutsDirectory, "Side1.json"),
            """
            {
                "$schema": "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json",
                "data": { "layout": [] }
            }
            """
        );
    }
}
