using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController;

/// <summary>
/// A subform PDF task set up by earlier Designer versions names a Subform component, and its own UI folder holds
/// a waiting page and a hidden copy of that component. Choosing the subform's UI folder replaces that setup.
/// </summary>
public class SubformPdfConfigUpgradeTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<SubformPdfConfigUpgradeTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "app-with-subform-pdf-v9";
    private const string Developer = "testUser";
    private const string TaskId = "SubformPdf";
    private const string SubformComponentId = "vehicles";

    private const string V9WaitingPage = """
        {
          "size": "L",
          "id": "service-task-waiting-title",
          "type": "Heading",
          "textResourceBindings": { "title": "service_task.waiting_title" }
        },
        {
          "id": "service-task-waiting-body",
          "type": "Paragraph",
          "textResourceBindings": { "title": "service_task.waiting_body" }
        }
        """;

    private const string V8WaitingPage = """
        {
          "size": "L",
          "id": "service-task-title",
          "type": "Heading",
          "textResourceBindings": { "title": "service_task_custom_pdf_default.title" }
        },
        {
          "id": "service-task-body",
          "type": "Paragraph",
          "textResourceBindings": { "title": "service_task_custom_pdf_default.body" }
        },
        {
          "id": "service-task-help-text",
          "type": "Paragraph",
          "textResourceBindings": { "title": "service_task_custom_pdf_default.help_text" }
        },
        {
          "id": "service-task-button-group",
          "type": "ButtonGroup",
          "children": ["service-task-retry-button", "service-task-back-button"]
        },
        {
          "id": "service-task-retry-button",
          "type": "Button",
          "textResourceBindings": { "title": "service_task_custom_pdf_default.retry_button" }
        },
        {
          "id": "service-task-back-button",
          "type": "ActionButton",
          "textResourceBindings": { "title": "service_task_custom_pdf_default.back_button" },
          "action": "reject",
          "buttonStyle": "secondary"
        }
        """;

    private const string ComponentCopy = """
        { "id": "vehicles", "type": "Subform", "layoutSet": "vehicleSubform", "hidden": true }
        """;

    [Theory]
    [InlineData(V9WaitingPage)]
    [InlineData(V8WaitingPage)]
    public async Task UpsertProcessDefinition_WhenTaskUiFolderHoldsOnlyGeneratedContent_RemovesIt(string waitingPage)
    {
        await CopyRepositoryWithTaskUiFolder($"{waitingPage},{ComponentCopy}");

        using HttpResponseMessage response = await PutProcessDefinitionWithUpgrade();
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        Assert.False(Directory.Exists(TaskUiFolderPath));
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenTaskUiFolderHoldsOtherComponents_KeepsIt()
    {
        const string CustomText = """
            { "id": "custom-text", "type": "Paragraph", "textResourceBindings": { "title": "custom.text" } }
            """;
        await CopyRepositoryWithTaskUiFolder($"{V9WaitingPage},{CustomText},{ComponentCopy}");

        using HttpResponseMessage response = await PutProcessDefinitionWithUpgrade();
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        Assert.True(File.Exists(Path.Join(TaskUiFolderPath, "layouts", "ServiceTask.json")));
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenTaskUiFolderHoldsOtherFiles_KeepsIt()
    {
        await CopyRepositoryWithTaskUiFolder($"{V9WaitingPage},{ComponentCopy}");
        await File.WriteAllTextAsync(Path.Join(TaskUiFolderPath, "RuleHandler.js"), "");

        using HttpResponseMessage response = await PutProcessDefinitionWithUpgrade();
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        Assert.True(File.Exists(Path.Join(TaskUiFolderPath, "layouts", "ServiceTask.json")));
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenCopyIsOfAnotherComponent_KeepsTaskUiFolder()
    {
        await CopyRepositoryWithTaskUiFolder($"{V9WaitingPage},{ComponentCopy.Replace("vehicles", "notes")}");

        using HttpResponseMessage response = await PutProcessDefinitionWithUpgrade();
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        Assert.True(Directory.Exists(TaskUiFolderPath));
    }

    private string _repository;

    private string TaskUiFolderPath => Path.Join(TestRepoPath, "App", "ui", TaskId);

    private async Task CopyRepositoryWithTaskUiFolder(string components)
    {
        _repository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, _repository);

        Directory.CreateDirectory(Path.Join(TaskUiFolderPath, "layouts"));
        await File.WriteAllTextAsync(
            Path.Join(TaskUiFolderPath, "Settings.json"),
            """{ "pages": { "order": ["ServiceTask"] }, "defaultDataType": "model" }"""
        );
        await File.WriteAllTextAsync(
            Path.Join(TaskUiFolderPath, "layouts", "ServiceTask.json"),
            $$"""{ "data": { "layout": [{{components}}] } }"""
        );
    }

    private async Task<HttpResponseMessage> PutProcessDefinitionWithUpgrade()
    {
        var metadata = new ProcessDefinitionMetadata
        {
            SubformPdfConfigUpgrade = new SubformPdfConfigUpgrade
            {
                TaskId = TaskId,
                SubformComponentId = SubformComponentId,
            },
        };
        string processContent = await File.ReadAllTextAsync(
            Path.Join(TestRepoPath, "App", "config", "process", "process.bpmn")
        );

        using var form = new MultipartFormDataContent();
        string metadataString = JsonSerializer.Serialize(
            metadata,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        form.Add(new StringContent(processContent, Encoding.UTF8), "content", "process.bpmn");
        form.Add(new StringContent(metadataString, Encoding.UTF8, MediaTypeNames.Application.Json), "metadata");

        string url = $"/designer/api/{Org}/{_repository}/process-modelling/process-definition";
        return await HttpClient.PutAsync(url, form);
    }
}
