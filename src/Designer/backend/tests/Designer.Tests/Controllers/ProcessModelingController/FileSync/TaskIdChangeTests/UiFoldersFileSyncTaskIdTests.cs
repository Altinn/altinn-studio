using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.TaskIdChangeTests;

public class UiFoldersFileSyncTaskIdTests
    : DesignerEndpointsTestsBase<UiFoldersFileSyncTaskIdTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/process-modelling/process-definition";

    public UiFoldersFileSyncTaskIdTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task UpsertProcessDefinition_WhenV9App_RenamesLayoutSetFolderToNewTaskId()
    {
        // app-with-layoutsets-v9 has no layout-sets.json; the layout set folder name equals the task id.
        const string oldTaskId = "Task_1";
        const string newTaskId = "SomeNewTaskId";
        const string subformFolder = "moreInfoSubform";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);

        var metadata = new ProcessDefinitionMetadata
        {
            TaskIdChange = new TaskIdChange { OldId = oldTaskId, NewId = newTaskId },
        };

        string processContent = TestDataHelper.GetFileFromRepo(
            Org,
            targetRepository,
            Developer,
            "App/config/process/process.bpmn"
        );
        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(
            metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        form.Add(new StreamContent(processStream), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        using var response = await HttpClient.PutAsync(VersionPrefix(Org, targetRepository), form);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        Assert.False(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", oldTaskId)));
        Assert.True(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", newTaskId)));
        // The subform layout set has no connected task, so it must be left untouched.
        Assert.True(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", subformFolder)));
    }
}
