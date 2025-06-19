using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TaskNavigationController;

public class GetTaskNavigationTests(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<GetTaskNavigationTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/task-navigation";

    [Theory]
    [InlineData("ttd", "app-with-groups-and-taskNavigation", "testUser")]
    public async Task GetTaskNavigation_WhenExists_ReturnsTaskNavigationArray(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string expected = JsonSerializer.Serialize(new List<TaskNavigationGroupDto>(){
            new ()
            {
                TaskId = "Task_1",
                TaskType = "data",
                Name = "tasks.form"
            },
            new ()
            {
                TaskId = "Task_Confirm",
                TaskType = "confirmation"
            },
            new ()
            {
                TaskType = "receipt"
            }
        });
        string actual = await response.Content.ReadAsStringAsync();
        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData("ttd", "app-with-process-and-layoutsets", "testUser")]
    public async Task GetTaskNavigation_WhenDoesNotExist_ReturnsEmptyArray(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string expected = "[]";
        string actual = await response.Content.ReadAsStringAsync();
        Assert.Equal(expected, actual);
    }
}
