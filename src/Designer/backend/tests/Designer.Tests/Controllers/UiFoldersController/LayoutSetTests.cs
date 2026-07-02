using System.Collections.Generic;
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

namespace Designer.Tests.Controllers.UiFoldersController;

public class LayoutSetTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<LayoutSetTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/ui-folders/layout-sets";

    private static string SettingsPath(string layoutSetName) => $"App/ui/{layoutSetName}/Settings.json";

    private static string InitialLayoutPath(string layoutSetName) => $"App/ui/{layoutSetName}/layouts/Side1.json";

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task GetLayoutSets_WhenNoDerivableSets_ReturnsEmptyArray(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string actual = await response.Content.ReadAsStringAsync();
        Assert.Equal("[]", actual);
    }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets-v9", "testUser")]
    public async Task GetLayoutSets_WhenSetsExist_ReturnsDerivedSets(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string content = await response.Content.ReadAsStringAsync();
        List<LayoutSetConfigDto> layoutSets = JsonSerializer.Deserialize<List<LayoutSetConfigDto>>(content);

        Assert.Equal(2, layoutSets.Count);

        LayoutSetConfigDto dataSet = Assert.Single(layoutSets, layoutSet => layoutSet.Id == "Task_1");
        Assert.Equal("model", dataSet.DataType);

        LayoutSetConfigDto subform = Assert.Single(layoutSets, layoutSet => layoutSet.Id == "moreInfoSubform");
        Assert.Equal("subform", subform.Type);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenValidPayload_CreatesLayoutSetFiles(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string NewLayoutSetName = "newLayoutSet";
        var payload = new LayoutSetPayload
        {
            TaskType = TaskType.Data,
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = NewLayoutSetName, DataType = "model" },
        };

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.True(
            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, InitialLayoutPath(NewLayoutSetName))
        );

        string savedSettings = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            SettingsPath(NewLayoutSetName)
        );
        JsonNode settings = JsonNode.Parse(savedSettings);
        Assert.Equal("model", (string)settings["defaultDataType"]);
        Assert.Equal("Side1", (string)settings["pages"]["order"].AsArray()[0]);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenSubform_CreatesSetAndReturnsItInResponse(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string NewLayoutSetName = "newSubform";
        var payload = new LayoutSetPayload
        {
            LayoutSetConfigDto = new LayoutSetConfigDto { Id = NewLayoutSetName, Type = "subform" },
        };

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string content = await response.Content.ReadAsStringAsync();
        List<LayoutSetConfigDto> layoutSets = JsonSerializer.Deserialize<List<LayoutSetConfigDto>>(content);
        LayoutSetConfigDto created = Assert.Single(layoutSets, layoutSet => layoutSet.Id == NewLayoutSetName);
        Assert.Equal("subform", created.Type);

        string savedSettings = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            SettingsPath(NewLayoutSetName)
        );
        Assert.Equal("subform", (string)JsonNode.Parse(savedSettings)["type"]);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenIdAlreadyExists_ReturnsOkWithInfoMessage(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        var payload = new LayoutSetPayload { LayoutSetConfigDto = new LayoutSetConfigDto { Id = "form" } };

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string content = await response.Content.ReadAsStringAsync();
        Assert.Contains("infoMessage", content);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task AddLayoutSet_WhenInvalidId_ReturnsBadRequest(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        var payload = new LayoutSetPayload { LayoutSetConfigDto = new LayoutSetConfigDto { Id = "invalid name!" } };

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task UpdateLayoutSetName_WhenValidName_RenamesFolder(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string OldLayoutSetName = "form";
        const string NewLayoutSetName = "renamedForm";

        string url = $"{VersionPrefix(org, targetRepository)}/{OldLayoutSetName}";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(NewLayoutSetName),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.True(TestDataHelper.FileExistsInRepo(org, targetRepository, developer, SettingsPath(NewLayoutSetName)));
        Assert.False(TestDataHelper.FileExistsInRepo(org, targetRepository, developer, SettingsPath(OldLayoutSetName)));
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task DeleteLayoutSet_WhenExists_RemovesFolder(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        const string LayoutSetToDelete = "subform";

        string url = $"{VersionPrefix(org, targetRepository)}/{LayoutSetToDelete}";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.False(
            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, SettingsPath(LayoutSetToDelete))
        );
    }
}
