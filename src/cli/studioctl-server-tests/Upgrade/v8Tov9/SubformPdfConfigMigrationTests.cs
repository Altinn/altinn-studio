using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class SubformPdfConfigMigrationTests : IDisposable
{
    private const string ProcessPath = "config/process/process.bpmn";

    /// <summary>The copy Altinn Studio generates in a subform PDF task's folder.</summary>
    private const string GeneratedCopy =
        """{ "id": "Subform", "type": "Subform", "layoutSet": "SubformFolder", "hidden": true }""";

    /// <summary>The waiting page Altinn Studio generates for a v9 service task.</summary>
    private const string GeneratedWaitingComponents = """
        { "size": "L", "id": "service-task-waiting-title", "type": "Heading", "textResourceBindings": { "title": "service_task.waiting_title" } },
        { "id": "service-task-waiting-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task.waiting_body" } }
        """;

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() => SubformPdfConfigMigration.Migrate(_app.Root);

    [Fact]
    public async Task NamesTheSubformFolderAndRemovesTheGeneratedTaskFolder()
    {
        _app.Write(
            ProcessPath,
            Process(Task("Task_1", "data"), SubformPdfTask("SubformPdf", "Subform", "SubformModel"))
        );
        WriteSubformFolder("SubformFolder", "SubformModel");
        // A folder named after the component, which the copy does not point at.
        WriteSubformFolder("Subform", "SubformModel");
        WriteTaskFolder("SubformPdf", GeneratedWaitingComponents + ",\n" + GeneratedCopy);

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(
            Process(Task("Task_1", "data"), SubformPdfTask("SubformPdf", uiFolder: "SubformFolder")),
            _app.Read(ProcessPath)
        );
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "SubformPdf")));
        Assert.True(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "SubformFolder")));
        Assert.Contains(result.Warnings, w => w.Contains("Removed ui/SubformPdf", StringComparison.Ordinal));
        Assert.Contains(result.Warnings, w => w.Contains("metadata key subformUiFolder", StringComparison.Ordinal));
    }

    [Fact]
    public async Task RemovesTheTaskFolderOfAV8WaitingPageWithAFullCopy()
    {
        // The v8 waiting page Altinn Studio generated for a PDF task, and a copy with the component's settings.
        _app.Write(ProcessPath, Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel")));
        WriteSubformFolder("SubformFolder", "SubformModel");
        WriteTaskFolder(
            "SubformPdf",
            """
            { "size": "L", "id": "service-task-title", "type": "Heading", "textResourceBindings": { "title": "service_task_custom_pdf_default.title" } },
            { "id": "service-task-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.body" } },
            { "id": "service-task-help-text", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.help_text" } },
            { "id": "service-task-button-group", "type": "ButtonGroup", "children": ["service-task-retry-button", "service-task-back-button"] },
            { "id": "service-task-retry-button", "type": "Button", "textResourceBindings": { "title": "service_task_custom_pdf_default.retry_button" } },
            { "id": "service-task-back-button", "type": "ActionButton", "textResourceBindings": { "title": "service_task_custom_pdf_default.back_button" }, "action": "reject", "buttonStyle": "secondary" },
            { "id": "Subform", "type": "Subform", "layoutSet": "SubformFolder", "textResourceBindings": { "title": "Side1.Subform.title" }, "tableColumns": [], "hidden": true }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "SubformPdf")));
    }

    [Fact]
    public async Task KeepsATaskFolderWithOtherContentAndLeavesATodoForItsPages()
    {
        _app.Write(ProcessPath, Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel")));
        WriteSubformFolder("SubformFolder", "SubformModel");
        WriteTaskFolder("SubformPdf", GeneratedCopy + ",\n" + """{ "id": "custom-text", "type": "Paragraph" }""");
        _app.Write("ui/SubformPdf/RuleHandler.js", "// custom");

        var result = await Migrate();

        Assert.Equal(Process(SubformPdfTask("SubformPdf", uiFolder: "SubformFolder")), _app.Read(ProcessPath));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "SubformPdf", "layouts", "ServiceTask.json")));
        var todo = Assert.Single(result.Todos);
        Assert.StartsWith("Kept ui/SubformPdf", todo, StringComparison.Ordinal);
        Assert.Contains("layouts/ServiceTask.json (custom-text)", todo, StringComparison.Ordinal);
        Assert.Contains("RuleHandler.js", todo, StringComparison.Ordinal);
        Assert.Contains("pages.order [ServiceTask]", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task KeepsATaskFolderWithOtherContentButNoPagesAndWarns()
    {
        _app.Write(ProcessPath, Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel")));
        WriteSubformFolder("SubformFolder", "SubformModel");
        WriteTaskFolder("SubformPdf", GeneratedCopy);
        _app.Write("ui/SubformPdf/Settings.json", """{ "pages": { "order": [] }, "defaultDataType": "Model" }""");
        _app.Write("ui/SubformPdf/RuleHandler.js", "// custom");

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(Process(SubformPdfTask("SubformPdf", uiFolder: "SubformFolder")), _app.Read(ProcessPath));
        var warning = Assert.Single(result.Warnings, w => w.StartsWith("Kept ui/SubformPdf", StringComparison.Ordinal));
        Assert.Contains("RuleHandler.js", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesTheTaskUnchangedWhenTheCopyIsMissing()
    {
        var process = Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel"));
        _app.Write(ProcessPath, process);
        WriteSubformFolder("SubformFolder", "SubformModel");
        WriteTaskFolder("SubformPdf", GeneratedWaitingComponents);

        var result = await Migrate();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Equal(process, _app.Read(ProcessPath));
        Assert.True(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "SubformPdf")));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("'SubformPdf'", todo, StringComparison.Ordinal);
        Assert.Contains("no Subform component with id 'Subform'", todo, StringComparison.Ordinal);
        Assert.DoesNotContain(result.Warnings, w => w.Contains("metadata", StringComparison.Ordinal));
    }

    [Fact]
    public async Task LeavesTheTaskUnchangedWhenTheCopyIsAmbiguous()
    {
        var process = Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel"));
        _app.Write(ProcessPath, process);
        WriteSubformFolder("SubformFolder", "SubformModel");
        WriteSubformFolder("OtherFolder", "SubformModel");
        WriteTaskFolder("SubformPdf", GeneratedCopy);
        _app.Write(
            "ui/SubformPdf/layouts/Other.json",
            """{ "data": { "layout": [{ "id": "Subform", "type": "Subform", "layoutSet": "OtherFolder" }] } }"""
        );

        var result = await Migrate();

        Assert.Equal(process, _app.Read(ProcessPath));
        Assert.Contains("has 2 Subform component", Assert.Single(result.Todos), StringComparison.Ordinal);
    }

    [Fact]
    public async Task MigratesTwoSubformPdfTasks()
    {
        _app.Write(
            ProcessPath,
            Process(
                SubformPdfTask("SubformPdf_A", "Subform", "SubformModel", filenameTextResourceKey: "pdf.name"),
                SubformPdfTask("SubformPdf_B", "Vehicles", "VehicleModel")
            )
        );
        WriteSubformFolder("SubformFolder", "SubformModel");
        WriteSubformFolder("VehicleFolder", "VehicleModel");
        WriteTaskFolder("SubformPdf_A", GeneratedCopy);
        WriteTaskFolder(
            "SubformPdf_B",
            """{ "id": "Vehicles", "type": "Subform", "layoutSet": "VehicleFolder", "hidden": true }"""
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(
            Process(
                SubformPdfTask("SubformPdf_A", uiFolder: "SubformFolder", filenameTextResourceKey: "pdf.name"),
                SubformPdfTask("SubformPdf_B", uiFolder: "VehicleFolder")
            ),
            _app.Read(ProcessPath)
        );
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "SubformPdf_A")));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "SubformPdf_B")));
        Assert.Contains(
            "[SubformPdf_A, SubformPdf_B]",
            Assert.Single(result.Warnings, w => w.Contains("metadata", StringComparison.Ordinal)),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task DoesNothingWithoutASubformPdfTask()
    {
        var process = Process(Task("Task_1", "data"), ServiceTask("Task_Pdf", "pdf"));
        _app.Write(ProcessPath, process);
        WriteTaskFolder("Task_Pdf", GeneratedWaitingComponents);

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(process, _app.Read(ProcessPath));
        Assert.True(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "Task_Pdf")));
    }

    [Fact]
    public async Task DoesNothingOnASecondRun()
    {
        _app.Write(ProcessPath, Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel")));
        WriteSubformFolder("SubformFolder", "SubformModel");
        WriteTaskFolder("SubformPdf", GeneratedCopy);
        await Migrate();
        var migrated = _app.Read(ProcessPath);

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(migrated, _app.Read(ProcessPath));
    }

    [Fact]
    public async Task WaitsForTheLayoutSetConversion()
    {
        var process = Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel"));
        _app.Write(ProcessPath, process);
        _app.Write("ui/layout-sets.json", """{ "sets": [] }""");

        var result = await Migrate();

        Assert.Contains("layout-sets.json", Assert.Single(result.Todos), StringComparison.Ordinal);
        Assert.Equal(process, _app.Read(ProcessPath));
    }

    [Fact]
    public async Task ReportsASubformFolderWithAnotherDataType()
    {
        _app.Write(ProcessPath, Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel")));
        WriteSubformFolder("SubformFolder", "OtherModel");
        WriteTaskFolder("SubformPdf", GeneratedCopy);

        var result = await Migrate();

        Assert.Equal(Process(SubformPdfTask("SubformPdf", uiFolder: "SubformFolder")), _app.Read(ProcessPath));
        Assert.Contains("defaultDataType 'OtherModel'", Assert.Single(result.Todos), StringComparison.Ordinal);
    }

    [Fact]
    public async Task KeepsCrlfAndByteOrderMark()
    {
        var process = Process(SubformPdfTask("SubformPdf", "Subform", "SubformModel")).Replace("\n", "\r\n") + "\r\n";
        _app.WriteBytes(ProcessPath, [0xEF, 0xBB, 0xBF, .. System.Text.Encoding.UTF8.GetBytes(process)]);
        WriteSubformFolder("SubformFolder", "SubformModel");
        WriteTaskFolder("SubformPdf", GeneratedCopy);

        await Migrate();

        var expected = Process(SubformPdfTask("SubformPdf", uiFolder: "SubformFolder")).Replace("\n", "\r\n") + "\r\n";
        Assert.Equal([0xEF, 0xBB, 0xBF, .. System.Text.Encoding.UTF8.GetBytes(expected)], _app.ReadBytes(ProcessPath));
    }

    /// <summary>
    /// A subform PDF task: the v8 configuration when <paramref name="componentId"/> is set, the v9 one when
    /// <paramref name="uiFolder"/> is.
    /// </summary>
    private static string SubformPdfTask(
        string id,
        string? componentId = null,
        string? dataTypeId = null,
        string? uiFolder = null,
        string? filenameTextResourceKey = null
    )
    {
        var settings = new List<string>();
        if (filenameTextResourceKey is not null)
            settings.Add($"<altinn:filenameTextResourceKey>{filenameTextResourceKey}</altinn:filenameTextResourceKey>");
        if (componentId is not null)
            settings.Add($"<altinn:subformComponentId>{componentId}</altinn:subformComponentId>");
        if (dataTypeId is not null)
            settings.Add($"<altinn:subformDataTypeId>{dataTypeId}</altinn:subformDataTypeId>");
        if (uiFolder is not null)
            settings.Add($"<altinn:subformUiFolder>{uiFolder}</altinn:subformUiFolder>");

        return $"""
                <bpmn:serviceTask id="{id}" name="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>subformPdf</altinn:taskType>
                      <altinn:subformPdfConfig>
            {string.Join("\n", settings.Select(s => "            " + s))}
                      </altinn:subformPdfConfig>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:serviceTask>
            """;
    }

    private void WriteSubformFolder(string folder, string dataType)
    {
        _app.Write($"ui/{folder}/Settings.json", $$"""{ "type": "subform", "defaultDataType": "{{dataType}}" }""");
        _app.Write($"ui/{folder}/layouts/Page.json", """{ "data": { "layout": [] } }""");
    }

    /// <summary>A subform PDF task's own UI folder, with one page holding <paramref name="components"/>.</summary>
    private void WriteTaskFolder(string taskId, string components)
    {
        _app.Write(
            $"ui/{taskId}/Settings.json",
            """{ "pages": { "order": ["ServiceTask"] }, "defaultDataType": "Model" }"""
        );
        _app.Write($"ui/{taskId}/layouts/ServiceTask.json", $$"""{ "data": { "layout": [{{components}}] } }""");
    }
}
