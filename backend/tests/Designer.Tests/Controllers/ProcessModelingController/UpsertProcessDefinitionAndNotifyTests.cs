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
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController;

public class UpsertProcessDefinitionAndNotifyTests : DisagnerEndpointsTestsBase<UpsertProcessDefinitionAndNotifyTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/process-modelling/process-definition-latest";

    public UpsertProcessDefinitionAndNotifyTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [MemberData(nameof(UpsertProcessDefinitionAndNotifyTestData))]
    public async Task UpsertProcessDefinition_ShouldReturnOk(string org, string app, string developer, string bpmnFilePath, ProcessDefinitionMetadata metadata)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        string fileContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);
        fileContent = metadata.TaskIdChanges.Aggregate(fileContent, (current, metadataTaskIdChange) => current.Replace(metadataTaskIdChange.OldId, metadataTaskIdChange.NewId));
        var fileStream = GenerateStreamFromString(fileContent);

        string url = VersionPrefix(org, targetRepository);

        var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        form.Add(new StreamContent(fileStream), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        using var response = await HttpClient.PutAsync(url, form);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/process/process.bpmn");

        XDocument expectedXml = XDocument.Parse(fileContent);
        XDocument savedXml = XDocument.Parse(savedFile);
        XNode.DeepEquals(savedXml, expectedXml).Should().BeTrue();
    }

    private static Stream GenerateStreamFromString(string s)
    {
        var stream = new MemoryStream();
        var writer = new StreamWriter(stream);
        writer.Write(s);
        writer.Flush();
        stream.Position = 0;
        return stream;
    }

    public static IEnumerable<object[]> UpsertProcessDefinitionAndNotifyTestData()
    {
        yield return new object[] { "ttd", "empty-app", "testUser", "App/config/process/process.bpmn",
           new ProcessDefinitionMetadata
           {
               TaskIdChanges = new List<TaskIdChange> { new() { OldId = "Task_1", NewId = "SomeNewId" } }
           } };
    }
}
