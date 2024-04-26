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

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.DataTypeChangeTests;

public class LayoutSetsFileSyncDataTypeTests : DisagnerEndpointsTestsBase<LayoutSetsFileSyncDataTypeTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/process-modelling/data-type";

    public LayoutSetsFileSyncDataTypeTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [MemberData(nameof(ProcessDataTypeChangedNotifyTestData))]
    public async Task ProcessDataTypeChangedNotify_Task1DisconnectedFromDataType_ShouldSyncLayoutSets(string org, string app, string developer,
        string layoutSetsPath, ProcessDefinitionMetadata metadata)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(layoutSetsPath, "App/ui/layout-sets.json");

        string url = VersionPrefix(org, targetRepository);

        string metadataString = JsonSerializer.Serialize(metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(metadataString, Encoding.UTF8, "application/json")
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        string layoutSetsFromRepo =
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");

        LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsFromRepo, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        layoutSets.Sets.Find(set => set.Tasks[0] == metadata.DataTypeChangeDetails.ConnectedTaskId).DataType.Should().BeNull();
    }

    [Theory]
    [MemberData(nameof(ProcessDataTypeChangedNotifyTestData))]
    public async Task ProcessDataTypeChangedNotify_NewDataTypeForTask5IsMessage_ShouldSyncLayoutSets(string org, string app, string developer, string applicationMetadataPath, ProcessDefinitionMetadata metadata)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/ui/layout-sets.json");
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

        string layoutSetsFromRepo =
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");

        LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsFromRepo, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        layoutSets.Sets.Find(set => set.Tasks[0] == task).DataType.Should().Be(dataTypeToConnect);
    }

    public static IEnumerable<object[]> ProcessDataTypeChangedNotifyTestData()
    {
        yield return
        [
            "ttd",
            "empty-app",
            "testUser",
            "App/ui/layout-sets.json",
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
