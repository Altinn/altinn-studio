using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.TaskIdChangeTests;

public class ApplicationMetadataFileSyncTaskIdTests
    : DesignerEndpointsTestsBase<ApplicationMetadataFileSyncTaskIdTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private string _targetRepository;

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/process-modelling/process-definition";

    public ApplicationMetadataFileSyncTaskIdTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [MemberData(nameof(UpsertProcessDefinitionAndNotifyTestData))]
    public async Task UpsertProcessDefinition_ShouldSyncApplicationMetadata(
        string org,
        string app,
        string developer,
        string bpmnFilePath,
        string applicationMetadataPath,
        ProcessDefinitionMetadata metadata
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/config/applicationmetadata.json");

        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);
        processContent.Replace(metadata.TaskIdChange.OldId, metadata.TaskIdChange.NewId);
        //processContent = metadata.TaskIdChange.Aggregate(processContent, (current, metadataTaskIdChange) => current.Replace(metadataTaskIdChange.OldId, metadataTaskIdChange.NewId));
        await SendProcessDefinition(org, targetRepository, processContent, metadata);

        string applicationMetadataFromRepo = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            "App/config/applicationmetadata.json"
        );

        ApplicationMetadata applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(
            applicationMetadataFromRepo,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

#pragma warning disable CS0618 // empty-app has no app-lib version, so Designer treats it as a v8 app
        Assert.DoesNotContain(
            applicationMetadata.DataTypes,
            dataType => dataType.TaskId == metadata.TaskIdChange.OldId
        );
        Assert.Contains(applicationMetadata.DataTypes, dataType => dataType.TaskId == metadata.TaskIdChange.NewId);
#pragma warning restore CS0618
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenAppReadsTaskIds_ShouldRenameTaskInTaskIdsAndIgnoreTaskId()
    {
        await PrepareRepo(appLibVersion: "9.0.0");
        DataTypeTaskBindingTestHelper.WriteTaskBinding(TestRepoPath, "message", taskId: null, ["Task_1", "Task_2"]);
        DataTypeTaskBindingTestHelper.WriteTaskBinding(TestRepoPath, "likert", taskId: "Task_1", taskIds: null);

        await SendTaskIdChange(oldId: "Task_1", newId: "SomeNewId");

        JsonObject message = DataTypeTaskBindingTestHelper.ReadDataType(TestRepoPath, "message");
        Assert.Equal(new[] { "SomeNewId", "Task_2" }, DataTypeTaskBindingTestHelper.ReadTaskIds(message));
        Assert.False(message.ContainsKey("taskId"));
        JsonObject likert = DataTypeTaskBindingTestHelper.ReadDataType(TestRepoPath, "likert");
        Assert.Equal("Task_1", (string)likert["taskId"]);
        Assert.False(likert.ContainsKey("taskIds"));
    }

    [Theory]
    [InlineData("8.12.10")]
    [InlineData("9.0.0-preview.8")]
    public async Task UpsertProcessDefinition_WhenAppReadsOnlyTaskId_ShouldRenameTaskIdAndKeepExistingTaskIdsInStep(
        string appLibVersion
    )
    {
        await PrepareRepo(appLibVersion);
        DataTypeTaskBindingTestHelper.WriteTaskBinding(TestRepoPath, "message", "Task_1", ["Task_1", "Task_2"]);
        DataTypeTaskBindingTestHelper.WriteTaskBinding(TestRepoPath, "likert", "Task_1", taskIds: null);

        await SendTaskIdChange(oldId: "Task_1", newId: "SomeNewId");

        JsonObject message = DataTypeTaskBindingTestHelper.ReadDataType(TestRepoPath, "message");
        Assert.Equal("SomeNewId", (string)message["taskId"]);
        Assert.Equal(new[] { "SomeNewId", "Task_2" }, DataTypeTaskBindingTestHelper.ReadTaskIds(message));
        JsonObject likert = DataTypeTaskBindingTestHelper.ReadDataType(TestRepoPath, "likert");
        Assert.Equal("SomeNewId", (string)likert["taskId"]);
        Assert.False(likert.ContainsKey("taskIds"));
    }

    public static IEnumerable<object[]> UpsertProcessDefinitionAndNotifyTestData()
    {
        yield return new object[]
        {
            "ttd",
            "empty-app",
            "testUser",
            "App/config/process/process.bpmn",
            "App/config/applicationmetadata.json",
            new ProcessDefinitionMetadata
            {
                TaskIdChange = new TaskIdChange { OldId = "Task_1", NewId = "SomeNewId" },
            },
        };
    }

    private async Task SendProcessDefinition(
        string org,
        string repository,
        string processContent,
        ProcessDefinitionMetadata metadata
    )
    {
        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));
        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(
            metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        form.Add(new StreamContent(processStream), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        using var response = await HttpClient.PutAsync(VersionPrefix(org, repository), form);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    private async Task PrepareRepo(string appLibVersion)
    {
        _targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "empty-app", "testUser", _targetRepository);
        await AddFileToRepo("App/config/applicationmetadata.json", "App/config/applicationmetadata.json");
        TestDataHelper.WriteAppLibVersion(TestRepoPath, appLibVersion);
    }

    private Task SendTaskIdChange(string oldId, string newId) =>
        SendProcessDefinition(
            "ttd",
            _targetRepository,
            SharedResourcesHelper.LoadTestDataAsString("App/config/process/process.bpmn"),
            new ProcessDefinitionMetadata
            {
                TaskIdChange = new TaskIdChange { OldId = oldId, NewId = newId },
            }
        );

    private async Task AddFileToRepo(string fileToCopyPath, string relativeCopyRepoLocation)
    {
        string fileContent = SharedResourcesHelper.LoadTestDataAsString(fileToCopyPath);
        string filePath = Path.Combine(TestRepoPath, relativeCopyRepoLocation);
        string folderPath = Path.GetDirectoryName(filePath);
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }
        await File.WriteAllTextAsync(filePath, fileContent);
    }
}
