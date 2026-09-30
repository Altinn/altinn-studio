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

        using var response = await UpsertProcessDefinition(org, targetRepository, bpmnFilePath, metadata);
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
    public async Task UpsertProcessDefinition_RenamesTaskIdInPolicyWithoutChangingOtherTaskIds()
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

        using var response = await UpsertProcessDefinition(
            org,
            targetRepository,
            "App/config/process/process.bpmn",
            metadata
        );
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

        // Task deletion finds the policy rule by its task ID. Renaming must keep this lookup valid.
        Assert.Contains($"urn:altinn:resource:app_ttd_empty-app:policyid:1:ruleid:{newId}", ruleIds);
        Assert.Contains(descriptions, description => description.EndsWith($"when it is in {newId}"));

        Assert.Contains("urn:altinn:resource:app_ttd_empty-app:policyid:1:ruleid:Task_10", ruleIds);
        Assert.Contains(descriptions, description => description.EndsWith("when it is in Task_10"));
    }

    private async Task<HttpResponseMessage> UpsertProcessDefinition(
        string org,
        string targetRepository,
        string bpmnFilePath,
        ProcessDefinitionMetadata metadata
    )
    {
        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);
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
