using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// End-to-end ordering check for the service task page step: it runs after the layout-set conversion, so it finds
/// a v8 PDF task's layout set at ui/&lt;taskId&gt;. The csproj upgrade and semantic analysis are skipped so the run
/// stays offline and local.
/// </summary>
public sealed class V8Tov9UpgradeServiceTaskPageTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task Upgrade_RemovesThePageDesignerGeneratedForAPdfTaskInALayoutSetsApp()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>
              <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
              <PackageReference Include="Altinn.App.Core" Version="9.0.0" />
            </ItemGroup></Project>
            """
        );
        _app.Write("config/process/process.bpmn", Process(Task("Task_1", "data"), PdfServiceTask("PdfTask")));
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "sets": [
                { "id": "form", "dataType": "Model", "tasks": ["Task_1"] },
                { "id": "pdf", "dataType": "Model", "tasks": ["PdfTask"] }
              ]
            }
            """
        );
        _app.Write("ui/form/Settings.json", """{ "pages": { "order": ["Page1"] } }""");
        _app.Write("ui/form/layouts/Page1.json", """{ "data": { "layout": [] } }""");
        // The folder the v8 Designer generated for a PDF task, with the Header it wrote then, which the layout
        // migrations rename to Heading before the page step looks for it.
        _app.Write(
            "ui/pdf/Settings.json",
            """{ "pages": { "pdfLayoutName": "PdfLayout", "order": ["ServiceTask"] } }"""
        );
        _app.Write("ui/pdf/layouts/PdfLayout.json", """{ "data": { "layout": [] } }""");
        _app.Write(
            "ui/pdf/layouts/ServiceTask.json",
            """
            { "data": { "layout": [
              { "size": "L", "id": "service-task-title", "type": "Header", "textResourceBindings": { "title": "service_task_custom_pdf_default.title" } },
              { "id": "service-task-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.body" } },
              { "id": "service-task-help-text", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.help_text" } },
              { "id": "service-task-button-group", "type": "ButtonGroup", "children": ["service-task-retry-button", "service-task-back-button"] },
              { "id": "service-task-retry-button", "type": "Button", "textResourceBindings": { "title": "service_task_custom_pdf_default.retry_button" } },
              { "id": "service-task-back-button", "type": "ActionButton", "textResourceBindings": { "title": "service_task_custom_pdf_default.back_button" }, "action": "reject", "buttonStyle": "secondary" }
            ] } }
            """
        );

        var report = new UpgradeReport();
        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: new StringWriter(),
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        var step = Assert.Single(report.Steps, step => step.Name == "Service task pages");
        Assert.DoesNotContain(step.Messages, message => message.Status == UpgradeMessageStatus.Todo);
        Assert.Contains(
            step.Messages,
            message => message.Text.StartsWith("Removed the page 'ServiceTask'", StringComparison.Ordinal)
        );
        Assert.False(File.Exists(Path.Combine(_app.Root, "App", "ui", "layout-sets.json")));
        var pages = JsonNode.Parse(_app.Read("ui/PdfTask/Settings.json"))?["pages"];
        Assert.Equal("""{"pdfLayoutName":"PdfLayout","order":[]}""", pages?.ToJsonString());
        Assert.False(File.Exists(Path.Combine(_app.Root, "App", "ui", "PdfTask", "layouts", "ServiceTask.json")));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "PdfTask", "layouts", "PdfLayout.json")));
    }
}
