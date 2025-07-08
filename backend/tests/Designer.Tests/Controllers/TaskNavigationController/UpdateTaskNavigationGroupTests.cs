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

namespace Designer.Tests.Controllers.TaskNavigationController;

public class UpdateTaskNavigationTests(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<UpdateTaskNavigationTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/task-navigation";

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task UpdateTaskNavigation_WhenValidPayload_ReturnsNoContent(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);

        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList = [new ()
        {
            TaskId = "data",
            Name = "data",
        }, new ()
        {
            TaskType = "receipt",
            Name = "receipt",
        }];

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(taskNavigationGroupDtoList), Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        string relativePath = "App/ui/layout-sets.json";

        JsonNode expectedData = JsonNode.Parse(JsonSerializer.Serialize(taskNavigationGroupDtoList.Select(taskNavigationGroupDto => taskNavigationGroupDto.ToDomain())));

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
        JsonNode savedData = JsonNode.Parse(savedFile)["uiSettings"]["taskNavigation"];

        Assert.True(JsonUtils.DeepEquals(expectedData.ToJsonString(), savedData.ToJsonString()));
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task UpdateTaskNavigation_WhenEmptyPayload_ReturnsNoContent(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent("[]", Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        string relativePath = "App/ui/layout-sets.json";

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
        JsonNode savedData = JsonNode.Parse(savedFile)["uiSettings"]["taskNavigation"];

        Assert.Null(savedData);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task UpdateTaskNavigation_WhenInvalidPayload_ReturnsBadRequest(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);

        IEnumerable<TaskNavigationGroupDto> taskNavigationGroupDtoList = [new ()
        {
            TaskType = "test",
        }];

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(taskNavigationGroupDtoList), Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        string relativePath = "App/ui/layout-sets.json";

        string expectedFile = TestDataHelper.GetFileFromRepo(org, app, developer, relativePath);
        JsonNode expectedData = JsonNode.Parse(expectedFile)["uiSettings"]["taskNavigation"];

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
        JsonNode savedData = JsonNode.Parse(savedFile)["uiSettings"]["taskNavigation"];

        Assert.True(JsonUtils.DeepEquals(expectedData.ToJsonString(), savedData.ToJsonString()));
    }
}
