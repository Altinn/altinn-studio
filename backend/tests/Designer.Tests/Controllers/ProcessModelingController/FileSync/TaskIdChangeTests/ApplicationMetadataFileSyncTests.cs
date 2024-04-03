using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.TaskIdChangeTests;

public class ApplicationMetadataFileSyncTests : DisagnerEndpointsTestsBase<UpsertProcessDefinitionAndNotifyTests>, IClassFixture<WebApplicationFactory<Program>>
{

    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/process-modelling/process-definition-latest";

    public ApplicationMetadataFileSyncTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [MemberData(nameof(UpsertProcessDefinitionAndNotifyTestData))]
    public async Task UpsertProcessDefinition_ShouldSyncApplicationMetadata(string org, string app, string developer, string bpmnFilePath, string applicationMetadataPath, ProcessDefinitionMetadata metadata)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(applicationMetadataPath, "App/config/applicationmetadata.json");

        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);
        processContent = metadata.TaskIdChanges.Aggregate(processContent, (current, metadataTaskIdChange) => current.Replace(metadataTaskIdChange.OldId, metadataTaskIdChange.NewId));
        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        string url = VersionPrefix(org, targetRepository);

        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        form.Add(new StreamContent(processStream), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        using var response = await HttpClient.PutAsync(url, form);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        string applicationMetadataFromRepo = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");

        ApplicationMetadata applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataFromRepo, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        foreach (var taskIdChange in metadata.TaskIdChanges)
        {
            applicationMetadata.DataTypes.Should().NotContain(dataType => dataType.TaskId == taskIdChange.OldId);
            applicationMetadata.DataTypes.Should().Contain(dataType => dataType.TaskId == taskIdChange.NewId);
        }
    }

    public static IEnumerable<object[]> UpsertProcessDefinitionAndNotifyTestData()
    {
        yield return new object[] { "ttd", "empty-app", "testUser", "App/config/process/process.bpmn", "App/config/applicationmetadata.json",
            new ProcessDefinitionMetadata
            {
                TaskIdChanges = new List<TaskIdChange> { new() { OldId = "Task_1", NewId = "SomeNewId" } }
            } };
    }

    private async Task<string> AddFileToRepo(string fileToCopyPath, string relativeCopyRepoLocation)
    {
        string fileContent = SharedResourcesHelper.LoadTestDataAsString(fileToCopyPath);
        string filePath = Path.Combine(TestRepoPath, relativeCopyRepoLocation);
        string folderPath = Path.GetDirectoryName(filePath);
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }
        await File.WriteAllTextAsync(filePath, fileContent);
        return fileContent;
    }


}
