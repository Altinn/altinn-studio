using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// End-to-end ordering check for the subform PDF task step: it runs after the layout migrations and the layout-set
/// conversion, so it finds the task's folder at ui/&lt;taskId&gt; with the v8 waiting page already migrated. The
/// csproj upgrade and semantic analysis are skipped so the run stays offline and local.
/// </summary>
public sealed class V8Tov9UpgradeSubformPdfTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task Upgrade_RewritesASubformPdfTaskFromALayoutSetsApp()
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
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                """
                    <bpmn:serviceTask id="SubformPdf" name="SubformPdf">
                      <bpmn:extensionElements>
                        <altinn:taskExtension>
                          <altinn:taskType>subformPdf</altinn:taskType>
                          <altinn:subformPdfConfig>
                            <altinn:subformComponentId>Subform</altinn:subformComponentId>
                            <altinn:subformDataTypeId>SubformModel</altinn:subformDataTypeId>
                          </altinn:subformPdfConfig>
                        </altinn:taskExtension>
                      </bpmn:extensionElements>
                    </bpmn:serviceTask>
                """
            )
        );
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "sets": [
                { "id": "form", "dataType": "Model", "tasks": ["Task_1"] },
                { "id": "subform", "dataType": "SubformModel", "type": "subform" },
                { "id": "subform-pdf", "dataType": "Model", "tasks": ["SubformPdf"] }
              ]
            }
            """
        );
        _app.Write("ui/form/Settings.json", """{ "pages": { "order": ["Page1"] } }""");
        _app.Write(
            "ui/form/layouts/Page1.json",
            """{ "data": { "layout": [{ "id": "Subform", "type": "Subform", "layoutSet": "subform" }] } }"""
        );
        _app.Write("ui/subform/Settings.json", """{ "pages": { "order": ["Page1"] } }""");
        _app.Write("ui/subform/layouts/Page1.json", """{ "data": { "layout": [] } }""");
        // The waiting page the v8 Designer generated, with a Header the layout migrations rename to Heading.
        _app.Write("ui/subform-pdf/Settings.json", """{ "pages": { "order": ["ServiceTask"] } }""");
        _app.Write(
            "ui/subform-pdf/layouts/ServiceTask.json",
            """
            { "data": { "layout": [
              { "size": "L", "id": "service-task-title", "type": "Header", "textResourceBindings": { "title": "service_task_custom_pdf_default.title" } },
              { "id": "service-task-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.body" } },
              { "id": "service-task-help-text", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.help_text" } },
              { "id": "service-task-button-group", "type": "ButtonGroup", "children": ["service-task-retry-button", "service-task-back-button"] },
              { "id": "service-task-retry-button", "type": "Button", "textResourceBindings": { "title": "service_task_custom_pdf_default.retry_button" } },
              { "id": "service-task-back-button", "type": "ActionButton", "textResourceBindings": { "title": "service_task_custom_pdf_default.back_button" }, "action": "reject", "buttonStyle": "secondary" },
              { "id": "Subform", "type": "Subform", "layoutSet": "subform", "hidden": true }
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

        var step = Assert.Single(report.Steps, step => step.Name == "Subform PDF tasks");
        Assert.DoesNotContain(step.Messages, message => message.Status == UpgradeMessageStatus.Todo);
        var process = _app.Read("config/process/process.bpmn");
        Assert.Contains("<altinn:subformUiFolder>subform</altinn:subformUiFolder>", process, StringComparison.Ordinal);
        Assert.DoesNotContain("subformComponentId", process, StringComparison.Ordinal);
        Assert.False(File.Exists(Path.Combine(_app.Root, "App", "ui", "layout-sets.json")));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "SubformPdf")));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "subform-pdf")));
        Assert.True(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "subform")));
    }
}
