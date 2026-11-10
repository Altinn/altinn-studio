using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

#pragma warning disable CS0618 // empty-app has no app-lib version, so Designer treats it as a v8 app

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.DataTypesChangeTests;

public class ApplicationMetadataFileSyncDataTypesTests
    : DesignerEndpointsTestsBase<ApplicationMetadataFileSyncDataTypesTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private string _targetRepository;

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/process-modelling/data-types";

    public ApplicationMetadataFileSyncDataTypesTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [MemberData(nameof(ProcessDataTypeChangedNotifyTestData))]
    public async Task ProcessDataTypesChangedNotify_TaskIsDisConnectedFromDataType_ShouldSyncApplicationMetadata(
        string org,
        string app,
        string developer,
        string applicationMetadataPath,
        DataTypesChange dataTypesChange
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/config/applicationmetadata.json");

        await SendDataTypesChange(org, targetRepository, dataTypesChange);

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

        Assert.DoesNotContain(
            applicationMetadata.DataTypes,
            dataType => dataType.AppLogic != null && dataType.TaskId == dataTypesChange.ConnectedTaskId
        ); // Task_1 is not connected to any data type
    }

    [Theory]
    [MemberData(nameof(ProcessDataTypeChangedNotifyTestData))]
    public async Task ProcessDataTypesChangedNotify_NewDataTypeForTask5IsMessage_ShouldSyncApplicationMetadata(
        string org,
        string app,
        string developer,
        string applicationMetadataPath,
        DataTypesChange dataTypesChange
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/config/applicationmetadata.json");
        string dataTypeToConnect = "message";
        string task = "Task_5";
        dataTypesChange.NewDataTypes = [dataTypeToConnect];
        dataTypesChange.ConnectedTaskId = task;

        await SendDataTypesChange(org, targetRepository, dataTypesChange);

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

        Assert.Equal(task, applicationMetadata.DataTypes.Find(type => type.Id == dataTypeToConnect).TaskId); // Data type 'message' is now connected to Task_5;
    }

    [Theory]
    [MemberData(nameof(ProcessDataTypeChangedNotifyTestData))]
    public async Task ProcessDataTypesChangedNotify_NewDataTypesForTask5IsMessageAndLikert_ShouldSyncApplicationMetadataBoth(
        string org,
        string app,
        string developer,
        string applicationMetadataPath,
        DataTypesChange dataTypesChange
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/config/applicationmetadata.json");
        string dataTypeToConnect1 = "message";
        string dataTypeToConnect2 = "likert";
        string task = "Task_5";
        dataTypesChange.NewDataTypes = [dataTypeToConnect1, dataTypeToConnect2];
        dataTypesChange.ConnectedTaskId = task;

        await SendDataTypesChange(org, targetRepository, dataTypesChange);

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

        Assert.Equal(2, applicationMetadata.DataTypes.FindAll(type => type.TaskId == task).Count); // Original connected data type 'datalist' should be disconnected
        Assert.Equal(task, applicationMetadata.DataTypes.Find(type => type.Id == dataTypeToConnect1).TaskId); // Data type 'message' is now connected to Task_5
        Assert.Equal(task, applicationMetadata.DataTypes.Find(type => type.Id == dataTypeToConnect2).TaskId); // Data type 'likert' is now connected to Task_5
    }

    [Theory]
    [MemberData(nameof(ProcessDataTypeChangedNotifyTestData))]
    public async Task ProcessDataTypeChangedNotify_NewDataTypeForCustomReceipt_ShouldNotSyncApplicationMetadata(
        string org,
        string app,
        string developer,
        string applicationMetadataPath,
        DataTypesChange dataTypesChange
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/config/applicationmetadata.json");
        string dataTypeToConnect = "message";
        string task = "CustomReceipt";
        dataTypesChange.NewDataTypes = [dataTypeToConnect];
        dataTypesChange.ConnectedTaskId = task;

        await SendDataTypesChange(org, targetRepository, dataTypesChange);

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
        Assert.DoesNotContain(
            applicationMetadata.DataTypes,
            dataType => dataType.AppLogic != null && dataType.TaskId == dataTypesChange.ConnectedTaskId
        ); // No data type connected to Task_1
    }

    [Fact]
    public async Task ProcessDataTypesChangedNotify_InV9App_ShouldMoveTaskBetweenTaskIdsLists()
    {
        await PrepareRepo(appLibVersion: "9.0.0");
        DataTypeTaskBindingTestHelper.WriteTaskBinding(TestRepoPath, "datalist", taskId: null, ["Task_5", "Task_6"]);
        DataTypeTaskBindingTestHelper.WriteTaskBinding(TestRepoPath, "message", taskId: "Task_1", taskIds: null);

        await SendDataTypesChange(
            "ttd",
            _targetRepository,
            new DataTypesChange { NewDataTypes = ["message"], ConnectedTaskId = "Task_5" }
        );

        JsonObject datalist = DataTypeTaskBindingTestHelper.ReadDataType(TestRepoPath, "datalist");
        Assert.Equal(new[] { "Task_6" }, DataTypeTaskBindingTestHelper.ReadTaskIds(datalist));
        JsonObject message = DataTypeTaskBindingTestHelper.ReadDataType(TestRepoPath, "message");
        Assert.Equal(new[] { "Task_5" }, DataTypeTaskBindingTestHelper.ReadTaskIds(message));
        Assert.Equal("Task_1", (string)message["taskId"]);
    }

    [Fact]
    public async Task ProcessDataTypesChangedNotify_InV9App_WhenDataTypesAreUnchanged_ShouldNotRewriteApplicationMetadata()
    {
        await PrepareRepo(appLibVersion: "9.0.0");
        DataTypeTaskBindingTestHelper.WriteTaskBinding(TestRepoPath, "datalist", taskId: null, ["Task_5", "Task_6"]);
        string applicationMetadataPath = Path.Combine(TestRepoPath, "App", "config", "applicationmetadata.json");
        string applicationMetadataBefore = await File.ReadAllTextAsync(applicationMetadataPath);

        await SendDataTypesChange(
            "ttd",
            _targetRepository,
            new DataTypesChange { NewDataTypes = ["datalist"], ConnectedTaskId = "Task_5" }
        );

        Assert.Equal(applicationMetadataBefore, await File.ReadAllTextAsync(applicationMetadataPath));
    }

    public static IEnumerable<object[]> ProcessDataTypeChangedNotifyTestData()
    {
        yield return
        [
            "ttd",
            "empty-app",
            "testUser",
            "App/config/applicationmetadata.json",
            new DataTypesChange { NewDataTypes = [], ConnectedTaskId = "Task_1" },
        ];
    }

    private async Task PrepareRepo(string appLibVersion)
    {
        _targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "empty-app", "testUser", _targetRepository);
        await AddFileToRepo("App/config/applicationmetadata.json", "App/config/applicationmetadata.json");
        TestDataHelper.WriteAppLibVersion(TestRepoPath, appLibVersion);
    }

    private async Task SendDataTypesChange(string org, string repository, DataTypesChange dataTypesChange)
    {
        string dataTypesChangeString = JsonSerializer.Serialize(
            dataTypesChange,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, VersionPrefix(org, repository))
        {
            Content = new StringContent(dataTypesChangeString, Encoding.UTF8, "application/json"),
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

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
