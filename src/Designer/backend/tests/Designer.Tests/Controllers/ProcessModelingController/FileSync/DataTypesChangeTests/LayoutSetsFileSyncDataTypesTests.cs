#nullable disable
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
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.DataTypesChangeTests;

public class LayoutSetsFileSyncDataTypesTests : DesignerEndpointsTestsBase<LayoutSetsFileSyncDataTypesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/process-modelling/data-types";

    public LayoutSetsFileSyncDataTypesTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "App/ui/layout-sets.json")]
    public async Task ProcessDataTypesChangedNotify_Task1DisconnectedFromDataType_ShouldSyncLayoutSets(string org, string app, string developer,
        string layoutSetsPath)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(layoutSetsPath, "App/ui/layout-sets.json");
        DataTypesChange dataTypesChange = new DataTypesChange { NewDataTypes = [null], ConnectedTaskId = "Task_1" };

        string url = VersionPrefix(org, targetRepository);

        string dataTypesChangeString = JsonSerializer.Serialize(dataTypesChange,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(dataTypesChangeString, Encoding.UTF8, "application/json")
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        string layoutSetsFromRepo =
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");

        LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsFromRepo, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        Assert.Null(layoutSets.Sets.Find(set => set.Tasks[0] == dataTypesChange.ConnectedTaskId).DataType);
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "App/ui/layout-sets.json")]
    public async Task ProcessDataTypesChangedNotify_NewDataTypeForTask5IsMessage_ShouldSyncLayoutSets(string org, string app, string developer, string layoutSetsPath)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(layoutSetsPath, "App/ui/layout-sets.json");
        string dataTypeToConnect = "message";
        string task = "Task_5";
        DataTypesChange dataTypesChange = new DataTypesChange
        { NewDataTypes = [dataTypeToConnect], ConnectedTaskId = task };


        string url = VersionPrefix(org, targetRepository);

        string dataTypesChangeString = JsonSerializer.Serialize(dataTypesChange,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(dataTypesChangeString, Encoding.UTF8, "application/json")
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        string layoutSetsFromRepo =
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");

        LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsFromRepo, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        Assert.Equal(dataTypeToConnect, layoutSets.Sets.Find(set => set.Tasks[0] == task).DataType);
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "App/ui/layout-sets.json")]
    public async Task ProcessDataTypesChangedNotify_NewDataTypesForTask5IsMessageAndLikert_ShouldSyncLayoutSetsWithMessage(string org, string app, string developer, string layoutSetsPath)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(layoutSetsPath, "App/ui/layout-sets.json");
        string dataTypeToConnect1 = "message";
        string dataTypeToConnect2 = "likert";
        string task = "Task_5";
        DataTypesChange dataTypesChange = new DataTypesChange
        { NewDataTypes = [dataTypeToConnect1, dataTypeToConnect2], ConnectedTaskId = task };

        string url = VersionPrefix(org, targetRepository);

        string dataTypesChangeString = JsonSerializer.Serialize(dataTypesChange,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(dataTypesChangeString, Encoding.UTF8, "application/json")
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        string layoutSetsFromRepo =
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");

        LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsFromRepo, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        Assert.Equal(dataTypeToConnect1, layoutSets.Sets.Find(set => set.Tasks[0] == task).DataType);
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "App/ui/layout-sets.json")]
    public async Task ProcessDataTypesChangedNotify_NewDataTypesForTask5IsMessageAndDatalist_ShouldSyncLayoutSetsWithExisting(string org, string app, string developer, string layoutSetsPath)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(layoutSetsPath, "App/ui/layout-sets.json");
        string dataTypeToConnect1 = "message";
        string dataTypeToConnect2 = "datalist";
        string task = "Task_5";
        DataTypesChange dataTypesChange = new DataTypesChange
        { NewDataTypes = [dataTypeToConnect1, dataTypeToConnect2], ConnectedTaskId = task };

        string url = VersionPrefix(org, targetRepository);

        string dataTypesChangeString = JsonSerializer.Serialize(dataTypesChange,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(dataTypesChangeString, Encoding.UTF8, "application/json")
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        string layoutSetsFromRepo =
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");

        LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsFromRepo, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        Assert.Equal(dataTypeToConnect2, layoutSets.Sets.Find(set => set.Tasks[0] == task).DataType);
    }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets", "testUser", "App/ui/layout-sets.json")]
    public async Task ProcessDataTypeChangedNotify_NewDataTypeForCustomReceipt_ShouldSyncLayoutSets(string org, string app, string developer, string layoutSetsPath)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(layoutSetsPath, "App/ui/layout-sets.json");
        string dataTypeToConnect = "message";
        string task = "CustomReceipt";
        DataTypesChange dataTypesChange = new DataTypesChange
        { NewDataTypes = [dataTypeToConnect], ConnectedTaskId = task };

        string url = VersionPrefix(org, targetRepository);

        string dataTypeChangeString = JsonSerializer.Serialize(dataTypesChange,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(dataTypeChangeString, Encoding.UTF8, "application/json")
        };
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        string layoutSetsFromRepo =
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");

        LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsFromRepo, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        Assert.Equal(dataTypeToConnect, layoutSets.Sets.Find(set => set.Tasks[0] == task).DataType);
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

