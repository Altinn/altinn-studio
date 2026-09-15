using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Linq;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.TaskIdChangeTests;

public class PolicyFileSyncTaskIdTests
    : DesignerEndpointsTestsBase<PolicyFileSyncTaskIdTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/process-modelling/process-definition";

    public PolicyFileSyncTaskIdTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [MemberData(nameof(UpsertProcessDefinitionAndNotifyTestData))]
    public async Task UpsertProcessDefinition_ShouldSyncLayoutSets(
        string org,
        string app,
        string developer,
        string bpmnFilePath,
        string policyFilePath,
        ProcessDefinitionMetadata metadata
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(policyFilePath, "App/config/authorization/policy.xml");

        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);
        processContent.Replace(metadata.TaskIdChange.OldId, metadata.TaskIdChange.NewId);
        //processContent = metadata.TaskIdChange.Aggregate(processContent,
        //(current, metadataTaskIdChange) => current.Replace(metadataTaskIdChange.OldId, metadataTaskIdChange.NewId));
        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        string url = VersionPrefix(org, targetRepository);

        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(
            metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        form.Add(new StreamContent(processStream), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        using var response = await HttpClient.PutAsync(url, form);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        string policyFileFromRepo = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            "App/config/authorization/policy.xml"
        );

        Assert.DoesNotContain(metadata.TaskIdChange.OldId, policyFileFromRepo);
        Assert.Contains(metadata.TaskIdChange.NewId, policyFileFromRepo);
    }

    [Fact]
    public async Task UpsertProcessDefinition_ShouldRewriteOnlyTheTaskIdSegmentOfRuleIds()
    {
        const string org = "ttd";
        const string app = "empty-app";
        const string developer = "testUser";
        const string oldId = "Task_1";
        const string newId = "SomeNewId";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        await AddFileToRepo(
            "App/config/authorization/policyWithTaskScopedRuleIds.xml",
            "App/config/authorization/policy.xml"
        );

        var metadata = new ProcessDefinitionMetadata
        {
            TaskIdChange = new TaskIdChange { OldId = oldId, NewId = newId },
        };

        using var response = await UpsertProcessDefinition(org, targetRepository, metadata);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        string policyFileFromRepo = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            "App/config/authorization/policy.xml"
        );

        List<XElement> rules = XDocument
            .Parse(policyFileFromRepo)
            .Descendants()
            .Where(element => element.Name.LocalName == "Rule")
            .ToList();

        List<string> ruleIds = rules.ConvertAll(rule => rule.Attribute("RuleId")?.Value);
        List<string> descriptions = rules.ConvertAll(rule =>
            rule.Descendants().First(child => child.Name.LocalName == "Description").Value
        );

        // The renamed task's rule must be findable by the rule id rebuilt from the new task id,
        // otherwise deleting the task later leaves the rule behind.
        Assert.Contains($"urn:altinn:resource:app_ttd_empty-app:policyid:1:ruleid:{newId}", ruleIds);
        Assert.Contains(descriptions, description => description.EndsWith($"when it is in {newId}"));

        // A different task whose id merely starts with the old id must be left alone, in both the
        // rule id and the description.
        Assert.Contains("urn:altinn:resource:app_ttd_empty-app:policyid:1:ruleid:Task_10", ruleIds);
        Assert.Contains(descriptions, description => description.EndsWith("when it is in Task_10"));
    }

    private async Task<HttpResponseMessage> UpsertProcessDefinition(
        string org,
        string targetRepository,
        ProcessDefinitionMetadata metadata
    )
    {
        string processContent = SharedResourcesHelper.LoadTestDataAsString("App/config/process/process.bpmn");
        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(
            metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        form.Add(new StreamContent(processStream), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        return await HttpClient.PutAsync(VersionPrefix(org, targetRepository), form);
    }

    public static IEnumerable<object[]> UpsertProcessDefinitionAndNotifyTestData()
    {
        yield return new object[]
        {
            "ttd",
            "empty-app",
            "testUser",
            "App/config/process/process.bpmn",
            "App/config/authorization/policy.xml",
            new ProcessDefinitionMetadata
            {
                TaskIdChange = new TaskIdChange { OldId = "Task_1", NewId = "SomeNewId" },
            },
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
