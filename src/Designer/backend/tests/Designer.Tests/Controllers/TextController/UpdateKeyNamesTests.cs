using System.IO;
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

namespace Designer.Tests.Controllers.TextController;

public class UpdateKeyNamesTests
    : DesignerEndpointsTestsBase<UpdateKeyNamesTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string V9App = "app-with-layoutsets-v9";
    private const string TaskFolder = "Task_1";
    private const string SubformFolder = "moreInfoSubform";
    private const string LayoutName = "Side1";
    private const string OldId = "some-old-id";
    private const string NewId = "new-id";

    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text";

    public UpdateKeyNamesTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task UpdateKeyNames_WhenV9App_UpdatesTheKeyInTheLayoutsOfEveryUiFolder()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, V9App, Developer, targetRepository);
        await WriteTextResourceWithOldId();
        await WriteLayoutWithTitle(TaskFolder, OldId);
        await WriteLayoutWithTitle(SubformFolder, OldId);

        using HttpResponseMessage response = await PutKeyMutation(targetRepository);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(NewId, await ReadLayoutTitle(TaskFolder));
        Assert.Equal(NewId, await ReadLayoutTitle(SubformFolder));
    }

    [Fact]
    public async Task UpdateKeyNames_WhenV9AppHasNoUiFolder_UpdatesTheTextResource()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, V9App, Developer, targetRepository);
        await WriteTextResourceWithOldId();
        Directory.Delete(Path.Combine(TestRepoPath, "App", "ui"), true);

        using HttpResponseMessage response = await PutKeyMutation(targetRepository);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string texts = await File.ReadAllTextAsync(TextResourcePath);
        Assert.Contains($"\"{NewId}\"", texts);
        Assert.DoesNotContain($"\"{OldId}\"", texts);
    }

    private string TextResourcePath => Path.Combine(TestRepoPath, "App", "config", "texts", "resource.nb.json");

    private string LayoutPath(string uiFolder) =>
        Path.Combine(TestRepoPath, "App", "ui", uiFolder, "layouts", $"{LayoutName}.json");

    private async Task WriteTextResourceWithOldId()
    {
        JsonObject textResource = new()
        {
            ["language"] = "nb",
            ["resources"] = new JsonArray
            {
                new JsonObject { ["id"] = "appName", ["value"] = V9App },
                new JsonObject { ["id"] = OldId, ["value"] = "Tittel" },
            },
        };
        await File.WriteAllTextAsync(TextResourcePath, textResource.ToJsonString());
    }

    private async Task WriteLayoutWithTitle(string uiFolder, string titleKey)
    {
        JsonObject layout = new()
        {
            ["data"] = new JsonObject
            {
                ["layout"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["id"] = "input",
                        ["type"] = "Input",
                        ["textResourceBindings"] = new JsonObject { ["title"] = titleKey },
                    },
                },
            },
        };
        await File.WriteAllTextAsync(LayoutPath(uiFolder), layout.ToJsonString());
    }

    private async Task<string> ReadLayoutTitle(string uiFolder)
    {
        JsonNode layout = JsonNode.Parse(await File.ReadAllTextAsync(LayoutPath(uiFolder)));
        return layout["data"]["layout"][0]["textResourceBindings"]["title"].GetValue<string>();
    }

    private async Task<HttpResponseMessage> PutKeyMutation(string repository)
    {
        string url = $"{VersionPrefix(Org, repository)}/keys";
        using StringContent content = new(
            $$"""[{ "oldId": "{{OldId}}", "newId": "{{NewId}}" }]""",
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );
        return await HttpClient.PutAsync(url, content);
    }
}
