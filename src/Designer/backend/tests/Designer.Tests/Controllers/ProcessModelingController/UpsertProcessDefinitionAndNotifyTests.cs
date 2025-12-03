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

namespace Designer.Tests.Controllers.ProcessModelingController;

public class UpsertProcessDefinitionAndNotifyTests : DesignerEndpointsTestsBase<UpsertProcessDefinitionAndNotifyTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/process-modelling/process-definition";

    public UpsertProcessDefinitionAndNotifyTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [MemberData(nameof(UpsertProcessDefinitionAndNotifyTestData))]
    public async Task UpsertProcessDefinition_ShouldReturnOk(string org, string app, string developer, string bpmnFilePath, ProcessDefinitionMetadata metadata)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);
        processContent.Replace(metadata.TaskIdChange.OldId, metadata.TaskIdChange.NewId);
        //fileContent = metadata.TaskIdChange.Aggregate(fileContent, (current, metadataTaskIdChange) => current.Replace(metadataTaskIdChange.OldId, metadataTaskIdChange.NewId));
        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        string url = VersionPrefix(org, targetRepository);

        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        form.Add(new StreamContent(processStream), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        using var response = await HttpClient.PutAsync(url, form);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/process/process.bpmn");

        XDocument expectedXml = XDocument.Parse(processContent);
        XDocument savedXml = XDocument.Parse(savedFile);
        Assert.True(XNode.DeepEquals(savedXml, expectedXml));
    }

    public static IEnumerable<object[]> UpsertProcessDefinitionAndNotifyTestData()
    {
        yield return new object[] { "ttd", "empty-app", "testUser", "App/config/process/process.bpmn",
           new ProcessDefinitionMetadata
           {
               TaskIdChange = new TaskIdChange { OldId = "Task_1", NewId = "SomeNewId" }
           } };
    }
}
