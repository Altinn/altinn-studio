using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.TaskIdChangeTests;

public class ApplicationMetadataFileSyncDataTypeTests : DisagnerEndpointsTestsBase<ProcessDataTypeChangedNotifyTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/process-modelling/data-type";

    public ApplicationMetadataFileSyncDataTypeTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [MemberData(nameof(ProcessDataTypeChangedNotifyTestData))]
    public async Task ProcessDataTypeChangedNotify_TaskIsDisConnectedFromDataType_ShouldSyncApplicationMetadata(string org, string app, string developer, string applicationMetadataPath, ProcessDefinitionMetadata metadata)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/config/applicationmetadata.json");

        string url = VersionPrefix(org, targetRepository);

        string metadataString = JsonSerializer.Serialize(metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(metadataString, Encoding.UTF8, "application/json")
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        string applicationMetadataFromRepo = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");

        ApplicationMetadata applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataFromRepo, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        applicationMetadata.DataTypes.Should().NotContain(dataType => dataType.AppLogic != null && dataType.TaskId == metadata.DataTypeChangeDetails.ConnectedTaskId); // No data type connected to Task_1
    }

    [Theory]
    [MemberData(nameof(ProcessDataTypeChangedNotifyTestData))]
    public async Task ProcessDataTypeChangedNotify_NewDataTypeForTask5IsMessage_ShouldSyncApplicationMetadata(
        string org, string app, string developer, string applicationMetadataPath, ProcessDefinitionMetadata metadata)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/config/applicationmetadata.json");
        string dataTypeToConnect = "message";
        string task = "Task_5";
        metadata.DataTypeChangeDetails.NewDataType = dataTypeToConnect;
        metadata.DataTypeChangeDetails.ConnectedTaskId = task;

        string url = VersionPrefix(org, targetRepository);

        string metadataString = JsonSerializer.Serialize(metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(metadataString, Encoding.UTF8, "application/json")
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        string applicationMetadataFromRepo = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");

        ApplicationMetadata applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataFromRepo, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        applicationMetadata.DataTypes.Find(type => type.Id == dataTypeToConnect).TaskId.Should().Be(task); // Data type 'message' is now connected to Task_5
    }

    public static IEnumerable<object[]> ProcessDataTypeChangedNotifyTestData()
    {
        yield return
        [
            "ttd",
            "empty-app",
            "testUser",
            "App/config/applicationmetadata.json",
            new ProcessDefinitionMetadata
            {
                DataTypeChangeDetails = new DataTypeChange { NewDataType = null, ConnectedTaskId = "Task_1" }
            }
        ];
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
