using System.IO;
using System.Linq;
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

        using var response = await PutProcessDefinition(targetRepository, oldTaskId, newTaskId);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        Assert.False(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", oldTaskId)));
        Assert.True(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", newTaskId)));
        // The subform layout set has no connected task, so it must be left untouched.
        Assert.True(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", subformFolder)));
    }

    [Theory]
    [InlineData("A")]
    [InlineData("TaskIdThatIsLongerThan28Chars")]
    [InlineData("New.Task")]
    public async Task UpsertProcessDefinition_WhenV9AppAndNewTaskIdIsNotAllowedAsLayoutSetName_ReturnsBadRequestAndLeavesRepositoryUnchanged(
        string newTaskId
    )
    {
        const string oldTaskId = "Task_1";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        string originalProcess = await File.ReadAllTextAsync(ProcessPath);

        using var response = await PutProcessDefinition(
            targetRepository,
            oldTaskId,
            newTaskId,
            originalProcess.Replace(oldTaskId, newTaskId)
        );
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        Assert.Equal(originalProcess, await File.ReadAllTextAsync(ProcessPath));
        Assert.True(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", oldTaskId)));
        Assert.DoesNotContain(
            newTaskId,
            Directory.GetDirectories(Path.Combine(TestRepoPath, "App", "ui")).Select(Path.GetFileName)
        );
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenV9AppAndNewTaskIdIsAnExistingLayoutSetName_ReturnsBadRequestAndLeavesRepositoryUnchanged()
    {
        const string oldTaskId = "Task_1";
        const string subformFolder = "moreInfoSubform";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        string originalProcess = await File.ReadAllTextAsync(ProcessPath);

        using var response = await PutProcessDefinition(
            targetRepository,
            oldTaskId,
            subformFolder,
            originalProcess.Replace(oldTaskId, subformFolder)
        );
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        Assert.Equal(originalProcess, await File.ReadAllTextAsync(ProcessPath));
        Assert.True(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", oldTaskId)));
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenV9AppAndTaskHasNoLayoutSet_AcceptsTaskIdOutsideLayoutSetNamingPolicy()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);

        using var response = await PutProcessDefinition(
            targetRepository,
            "TaskWithoutLayoutSet",
            "TaskIdThatIsLongerThan28Chars"
        );
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenV8App_DoesNotApplyLayoutSetNamingPolicyToTaskId()
    {
        // In v8 layout set folders are not named after tasks, so even a folder matching the old id is not renamed.
        const string layoutSetFolder = "layoutSet1";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets", Developer, targetRepository);

        using var response = await PutProcessDefinition(
            targetRepository,
            layoutSetFolder,
            "TaskIdThatIsLongerThan28Chars"
        );
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.True(Directory.Exists(Path.Combine(TestRepoPath, "App", "ui", layoutSetFolder)));
    }

    private string ProcessPath => Path.Combine(TestRepoPath, "App", "config", "process", "process.bpmn");

    private async Task<HttpResponseMessage> PutProcessDefinition(
        string repository,
        string oldTaskId,
        string newTaskId,
        string processContent = null
    )
    {
        var metadata = new ProcessDefinitionMetadata
        {
            TaskIdChange = new TaskIdChange { OldId = oldTaskId, NewId = newTaskId },
        };
        processContent ??= await File.ReadAllTextAsync(ProcessPath);

        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(
            metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        form.Add(new StringContent(processContent, Encoding.UTF8), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        return await HttpClient.PutAsync(VersionPrefix(Org, repository), form);
    }
}
