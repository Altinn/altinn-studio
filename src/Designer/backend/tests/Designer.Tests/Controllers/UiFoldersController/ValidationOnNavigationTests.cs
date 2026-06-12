using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.UiFoldersController;

public class ValidationOnNavigationTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<ValidationOnNavigationTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string GlobalSettingsPath = "App/ui/Settings.json";

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/ui-folders/settings/validation-on-navigation";

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task GetGlobalValidationOnNavigation_WhenExists_ReturnsConfig(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string expected = JsonSerializer.Serialize(
            new ValidationOnNavigation { Page = "current", Show = ["Expression", "Schema"] }
        );
        string actual = await response.Content.ReadAsStringAsync();
        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData("ttd", "app-with-process-and-layoutsets", "testUser")]
    public async Task GetGlobalValidationOnNavigation_WhenDoesNotExist_ReturnsNull(
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

        string actual = await response.Content.ReadAsStringAsync();
        Assert.Equal("null", actual);
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task SaveGlobalValidationOnNavigation_WhenValidPayload_ReturnsOk(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);

        var config = new ValidationOnNavigation { Page = "all", Show = ["Required"] };

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(config),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        JsonNode expectedData = JsonNode.Parse(JsonSerializer.Serialize(config));

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, GlobalSettingsPath);
        JsonNode savedData = JsonNode.Parse(savedFile)["validationOnNavigation"];

        Assert.True(JsonUtils.DeepEquals(expectedData.ToJsonString(), savedData.ToJsonString()));
    }

    [Theory]
    [InlineData("ttd", "app-with-groups-and-task-navigation", "testUser")]
    public async Task DeleteGlobalValidationOnNavigation_ReturnsOk(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url)
        {
            Content = new StringContent("{}", Encoding.UTF8, MediaTypeNames.Application.Json),
        };

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, GlobalSettingsPath);
        JsonNode savedData = JsonNode.Parse(savedFile)["validationOnNavigation"];

        Assert.Null(savedData);
    }
}
