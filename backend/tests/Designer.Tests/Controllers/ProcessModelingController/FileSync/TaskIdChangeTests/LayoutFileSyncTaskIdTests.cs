using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.TaskIdChangeTests;

public class LayoutFileSyncTaskIdTests : DesignerEndpointsTestsBase<LayoutFileSyncTaskIdTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public LayoutFileSyncTaskIdTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private static string GetVersionPrefix(string org, string repository)
    {
        return $"/designer/api/{org}/{repository}/process-modelling/process-definition-latest";
    }

    [Theory]
    [MemberData(nameof(GetReferencedTaskIdTestData))]
    public async Task UpsertProcessDefinitionAndNotify_ShouldUpdateLayout_WhenReferencedTaskIdIsChanged(
        string org,
        string app,
        string developer,
        string bpmnFilePath,
        ProcessDefinitionMetadata metadata)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath)
            .Replace(metadata.TaskIdChange.OldId, metadata.TaskIdChange.NewId);

        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        string url = GetVersionPrefix(org, targetRepository);

        using var form = new MultipartFormDataContent
        {
            { new StreamContent(processStream), "content", "process.bpmn" },
            {
                new StringContent(
                    JsonSerializer.Serialize(metadata, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
                    Encoding.UTF8,
                    MediaTypeNames.Application.Json),
                "metadata"
            }
        };

        // Act
        using var response = await HttpClient.PutAsync(url, form);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        string layoutFilePath = "App/ui/layoutSet2/layouts/layoutFile2InSet2.json";
        string layoutContent = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, layoutFilePath);

        JsonNode layout = JsonSerializer.Deserialize<JsonNode>(layoutContent);
        string newTaskId = layout["data"]["layout"][0]["target"]["taskId"]?.ToString();

        newTaskId.Should().Be(metadata.TaskIdChange.NewId);
        newTaskId.Should().NotBe(metadata.TaskIdChange.OldId);
    }

    [Theory]
    [MemberData(nameof(GetUnreferencedTaskIdTestData))]
    public async Task UpsertProcessDefinitionAndNotify_ShouldNotUpdateLayout_WhenUnreferencedTaskIdIsChanged(
        string org,
        string app,
        string developer,
        string bpmnFilePath,
        ProcessDefinitionMetadata metadata)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string layoutPath = "App/ui/layoutSet2/layouts/layoutFile2InSet2.json";
        string layoutBeforeUpdate = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, layoutPath);

        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath)
            .Replace(metadata.TaskIdChange.OldId, metadata.TaskIdChange.NewId);

        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        string url = GetVersionPrefix(org, targetRepository);

        using var form = new MultipartFormDataContent
        {
            { new StreamContent(processStream), "content", "process.bpmn" },
            {
                new StringContent(
                    JsonSerializer.Serialize(metadata, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
                    Encoding.UTF8,
                    MediaTypeNames.Application.Json),
                "metadata"
            }
        };

        // Act
        using var response = await HttpClient.PutAsync(url, form);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        string layoutAfterUpdate = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, layoutPath);
        layoutAfterUpdate.Should().Be(layoutBeforeUpdate);
    }

    public static IEnumerable<object[]> GetReferencedTaskIdTestData()
    {
        // "Task_1" is targeted by Summary2 component in "app-with-layoutsets"
        yield return new object[] { "ttd", "app-with-layoutsets", "testUser", "App/config/process/process.bpmn",
            new ProcessDefinitionMetadata { TaskIdChange = new TaskIdChange { OldId = "Task_1", NewId = "SomeNewId" } } };
    }

    public static IEnumerable<object[]> GetUnreferencedTaskIdTestData()
    {
        // "Task_2" is not targeted by Summary2 component in "app-with-layoutsets"
        yield return new object[] { "ttd", "app-with-layoutsets", "testUser", "App/config/process/process.bpmn",
            new ProcessDefinitionMetadata { TaskIdChange = new TaskIdChange { OldId = "Task_2", NewId = "SomeNewId" } } };
    }
}
