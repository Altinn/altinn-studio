using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.TaskIdChangeTests;

public class PolicyFileSyncTests : DisagnerEndpointsTestsBase<LayoutSetsFileSyncTests>,
    IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/process-modelling/process-definition-latest";

    public PolicyFileSyncTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [MemberData(nameof(UpsertProcessDefinitionAndNotifyTestData))]
    public async Task UpsertProcessDefinition_ShouldSyncLayoutSets(string org, string app, string developer,
        string bpmnFilePath, string policyFilePath, ProcessDefinitionMetadata metadata)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(policyFilePath, "App/config/authorization/policy.xml");

        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);
        processContent = metadata.TaskIdChanges.Aggregate(processContent,
            (current, metadataTaskIdChange) => current.Replace(metadataTaskIdChange.OldId, metadataTaskIdChange.NewId));
        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        string url = VersionPrefix(org, targetRepository);

        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        form.Add(new StreamContent(processStream), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        using var response = await HttpClient.PutAsync(url, form);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        string policyFileFromRepo =
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/authorization/policy.xml");

        foreach (var taskIdChange in metadata.TaskIdChanges)
        {
            policyFileFromRepo.Should().NotContain(taskIdChange.OldId);
            policyFileFromRepo.Should().Contain(taskIdChange.NewId);
        }

    }

    public static IEnumerable<object[]> UpsertProcessDefinitionAndNotifyTestData()
    {
        yield return new object[]
        {
            "ttd", "empty-app", "testUser", "App/config/process/process.bpmn",
            "App/config/authorization/policy.xml",
            new ProcessDefinitionMetadata
            {
                TaskIdChanges = new List<TaskIdChange> { new() { OldId = "Task_1", NewId = "SomeNewId" } }
            }
        };
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
