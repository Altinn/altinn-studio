using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Mappers;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.UiFoldersController;

public class TaskNavigationTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<TaskNavigationTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string GlobalSettingsPath = "App/ui/Settings.json";

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/ui-folders/settings/task-navigation";

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task GetGlobalTaskNavigation_WhenExists_ReturnsTaskNavigationArray(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string expected = JsonSerializer.Serialize(
            new List<TaskNavigationGroupDto>()
            {
                new()
                {
                    TaskId = "Task_1",
                    TaskType = "data",
                    Name = "tasks.form",
                },
                new() { TaskId = "Task_Confirm", TaskType = "confirmation" },
                new() { TaskType = "receipt" },
            }
        );
        string actual = await response.Content.ReadAsStringAsync();
        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData("ttd", "app-with-process-and-layoutsets", "testUser")]
    public async Task GetGlobalTaskNavigation_WhenDoesNotExist_ReturnsEmptyArray(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string expected = "[]";
        string actual = await response.Content.ReadAsStringAsync();
        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task UpdateGlobalTaskNavigation_WhenValidPayload_ReturnsNoContent(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);

        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList =
        [
            new() { TaskId = "data", Name = "data" },
            new() { TaskType = "receipt", Name = "receipt" },
        ];

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(taskNavigationGroupDtoList),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        JsonNode expectedData = JsonNode.Parse(
            JsonSerializer.Serialize(
                taskNavigationGroupDtoList.Select(taskNavigationGroupDto => taskNavigationGroupDto.ToDomain())
            )
        );

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, GlobalSettingsPath);
        JsonNode savedData = JsonNode.Parse(savedFile)["taskNavigation"];

        Assert.True(JsonUtils.DeepEquals(expectedData.ToJsonString(), savedData.ToJsonString()));
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task UpdateGlobalTaskNavigation_WhenEmptyPayload_ReturnsNoContent(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent("[]", Encoding.UTF8, MediaTypeNames.Application.Json),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, GlobalSettingsPath);
        JsonNode savedData = JsonNode.Parse(savedFile)["taskNavigation"];

        Assert.Null(savedData);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task UpdateGlobalTaskNavigation_WhenInvalidPayload_ReturnsBadRequest(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);

        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList = [new() { TaskType = "test" }];

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(taskNavigationGroupDtoList),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        string expectedFile = TestDataHelper.GetFileFromRepo(org, app, developer, GlobalSettingsPath);
        JsonNode expectedData = JsonNode.Parse(expectedFile)["taskNavigation"];

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, GlobalSettingsPath);
        JsonNode savedData = JsonNode.Parse(savedFile)["taskNavigation"];

        Assert.True(JsonUtils.DeepEquals(expectedData.ToJsonString(), savedData.ToJsonString()));
    }
}
