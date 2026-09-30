using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Xml.Linq;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController;

public class SubformPdfComponentChangeTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<SubformPdfComponentChangeTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string TaskId = "NewPdfTask";

    [Fact]
    public async Task SaveProcessDefinition_CreatesSubformCopyAfterSavingTaskAndRemovesItWhenCleared()
    {
        string repository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-subform-pdf-v9", Developer, repository);
        string process = (await File.ReadAllTextAsync(ProcessPath)).Replace("PdfWithoutPages", TaskId);

        using HttpResponseMessage selectionResponse = await SaveProcess(
            repository,
            process,
            new SubformPdfComponentChange
            {
                TaskId = TaskId,
                ComponentId = "vehicles",
                SourceLayoutSetId = "Task_1",
            }
        );

        Assert.Equal(HttpStatusCode.Accepted, selectionResponse.StatusCode);
        Assert.True(XNode.DeepEquals(XDocument.Parse(process), XDocument.Load(ProcessPath)));
        JsonNode settings = JsonNode.Parse(await File.ReadAllTextAsync(Path.Combine(TaskPath, "Settings.json")));
        Assert.Equal("model", (string)settings["defaultDataType"]);
        JsonArray components = await ReadComponents();
        JsonObject copy = components.OfType<JsonObject>().Single(component => (string)component["id"] == "vehicles");
        Assert.Equal("Subform", (string)copy["type"]);
        Assert.Equal("vehicleSubform", (string)copy["layoutSet"]);
        Assert.True((bool)copy["hidden"]);

        XDocument clearedProcess = XDocument.Parse(process);
        XNamespace bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";
        XNamespace altinn = "http://altinn.no/process";
        clearedProcess
            .Descendants(bpmn + "serviceTask")
            .Single(task => (string)task.Attribute("id") == TaskId)
            .Descendants(altinn + "subformPdfConfig")
            .Single()
            .RemoveNodes();

        using HttpResponseMessage clearResponse = await SaveProcess(
            repository,
            clearedProcess.ToString(),
            new SubformPdfComponentChange { TaskId = TaskId, PreviousComponentId = "vehicles" }
        );

        Assert.Equal(HttpStatusCode.Accepted, clearResponse.StatusCode);
        Assert.True(XNode.DeepEquals(clearedProcess, XDocument.Load(ProcessPath)));
        Assert.DoesNotContain(await ReadComponents(), component => (string)component["id"] == "vehicles");
    }

    [Fact]
    public async Task SaveProcessDefinition_WithSubformSelectionInV8_RejectsBeforeWriting()
    {
        string repository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "app-with-layoutsets", Developer, repository);
        string originalProcess = await File.ReadAllTextAsync(ProcessPath);

        using HttpResponseMessage response = await SaveProcess(
            repository,
            originalProcess.Replace("Task_1", TaskId),
            new SubformPdfComponentChange
            {
                TaskId = TaskId,
                ComponentId = "vehicles",
                SourceLayoutSetId = "Task_1",
            }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(originalProcess, await File.ReadAllTextAsync(ProcessPath));
    }

    private string ProcessPath => Path.Combine(TestRepoPath, "App", "config", "process", "process.bpmn");
    private string TaskPath => Path.Combine(TestRepoPath, "App", "ui", TaskId);

    private async Task<JsonArray> ReadComponents() =>
        JsonNode
            .Parse(await File.ReadAllTextAsync(Path.Combine(TaskPath, "layouts", "ServiceTask.json")))["data"]["layout"]
            .AsArray();

    private async Task<HttpResponseMessage> SaveProcess(
        string repository,
        string process,
        SubformPdfComponentChange change
    )
    {
        var metadata = new ProcessDefinitionMetadata { SubformPdfComponentChange = change };
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(process, Encoding.UTF8), "content", "process.bpmn");
        form.Add(
            new StringContent(
                JsonSerializer.Serialize(
                    metadata,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
                ),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            ),
            "metadata"
        );
        return await HttpClient.PutAsync(
            $"/designer/api/{Org}/{repository}/process-modelling/process-definition",
            form
        );
    }
}
