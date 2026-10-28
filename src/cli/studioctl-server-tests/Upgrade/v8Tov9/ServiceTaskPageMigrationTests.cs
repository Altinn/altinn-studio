using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ServiceTaskPageMigrationTests : IDisposable
{
    private const string ProcessPath = "config/process/process.bpmn";

    /// <summary>The page Altinn Studio Designer generates for a v8 PDF task, after the layout migrations.</summary>
    private static string DesignerPage() =>
        """
            { "size": "L", "id": "service-task-title", "type": "Heading", "textResourceBindings": { "title": "service_task_custom_pdf_default.title" } },
            { "id": "service-task-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.body" } },
            { "id": "service-task-help-text", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.help_text" } },
            { "id": "service-task-button-group", "type": "ButtonGroup", "children": ["service-task-retry-button", "service-task-back-button"] },
            { "id": "service-task-retry-button", "type": "Button", "textResourceBindings": { "title": "service_task_custom_pdf_default.retry_button" } },
            { "id": "service-task-back-button", "type": "ActionButton", "textResourceBindings": { "title": "service_task_custom_pdf_default.back_button" }, "action": "reject", "buttonStyle": "secondary" }
            """;

    /// <summary>
    /// The waiting page previews of v9 generated for PDF tasks. No app in production has it, so the upgrade treats
    /// it like any page a developer wrote.
    /// </summary>
    private const string PreviewWaitingPage = """
        { "size": "L", "id": "service-task-waiting-title", "type": "Heading", "textResourceBindings": { "title": "service_task.waiting_title" } },
        { "id": "service-task-waiting-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task.waiting_body" } }
        """;

    /// <summary>The settings Altinn Studio Designer writes for a PDF task, with <paramref name="order"/>.</summary>
    private static string Settings(string order = "\"ServiceTask\"") =>
        $$"""
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
              "pages": {
                "pdfLayoutName": "PdfLayout",
                "order": [{{order}}]
              }
            }
            """;

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() => ServiceTaskPageMigration.Migrate(_app.Root);

    [Fact]
    public async Task RemovesThePageAltinnStudioGenerated()
    {
        _app.Write(ProcessPath, Process(Task("Task_1", "data"), PdfServiceTask("PdfTask")));
        WriteTaskFolder("PdfTask", Settings(), DesignerPage());

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(Settings(order: ""), _app.Read("ui/PdfTask/Settings.json"));
        Assert.False(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("PdfTask", "PdfLayout")));
        Assert.Contains(
            "Removed the page 'ServiceTask' Altinn Studio generated in ui/PdfTask",
            Assert.Single(result.Warnings),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task MatchesRegardlessOfPropertyOrderAndKeepsTheSettingsFormatting()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        var settings = """
            {
              // Written by Altinn Studio
              "pages": { "order": [ "ServiceTask" ], "pdfLayoutName": "PdfLayout" },
              "defaultDataType": "Model"
            }

            """;
        _app.WriteBytes(
            "ui/PdfTask/Settings.json",
            [0xEF, 0xBB, 0xBF, .. System.Text.Encoding.UTF8.GetBytes(settings.Replace("\n", "\r\n"))]
        );
        WriteTaskFolder(
            "PdfTask",
            settings: null,
            DesignerPage()
                .Replace(
                    """{ "size": "L", "id": "service-task-title", "type": "Heading",""",
                    """{ "type": "Heading", "id": "service-task-title", "size": "L",""",
                    StringComparison.Ordinal
                )
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var expected = settings.Replace("[ \"ServiceTask\" ]", "[]", StringComparison.Ordinal).Replace("\n", "\r\n");
        Assert.Equal(
            [0xEF, 0xBB, 0xBF, .. System.Text.Encoding.UTF8.GetBytes(expected)],
            _app.ReadBytes("ui/PdfTask/Settings.json")
        );
        Assert.False(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
    }

    [Fact]
    public async Task TakesTheWaitingPageOfAV9PreviewOutOfTheOrderLikeAnyOtherPage()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        WriteTaskFolder("PdfTask", Settings(), PreviewWaitingPage);

        var result = await Migrate();

        Assert.Equal(Settings(order: ""), _app.Read("ui/PdfTask/Settings.json"));
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
        Assert.Contains("[ServiceTask]", Assert.Single(result.Warnings), StringComparison.Ordinal);
        Assert.Empty(result.Todos);
    }

    [Theory]
    [InlineData("service_task_custom_pdf_default.title", "pdf.waiting.title")]
    [InlineData("\"buttonStyle\": \"secondary\"", "\"buttonStyle\": \"primary\"")]
    [InlineData(
        "{ \"id\": \"service-task-body\"",
        "{ \"id\": \"extra\", \"type\": \"Image\" },\n{ \"id\": \"service-task-body\""
    )]
    public async Task TakesAChangedPageOutOfTheOrderOfAPdfTaskThatHasAPdfLayout(string generated, string changed)
    {
        // A PDF task with a pdfLayoutName rendered that, so in v8 the pages it listed showed only when it failed
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        WriteTaskFolder("PdfTask", Settings(), DesignerPage().Replace(generated, changed, StringComparison.Ordinal));

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(Settings(order: ""), _app.Read("ui/PdfTask/Settings.json"));
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
        var warning = Assert.Single(result.Warnings);
        Assert.Contains(
            "Took the page(s) [ServiceTask] out of pages.order in ui/PdfTask and kept their layout files",
            warning,
            StringComparison.Ordinal
        );
        Assert.Contains("The PDF is unchanged.", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemovesTheGeneratedPageAndTakesTheOthersOutOfTheOrderOfAPdfTaskThatHasAPdfLayout()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        WriteTaskFolder("PdfTask", Settings(order: "\"Intro\", \"ServiceTask\""), DesignerPage());
        _app.Write("ui/PdfTask/layouts/Intro.json", """{ "data": { "layout": [] } }""");

        var result = await Migrate();

        Assert.Equal(Settings(order: ""), _app.Read("ui/PdfTask/Settings.json"));
        Assert.False(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("PdfTask", "Intro")));
        Assert.Collection(
            result.Warnings,
            warning => Assert.Contains("Removed the page 'ServiceTask'", warning, StringComparison.Ordinal),
            warning => Assert.Contains("Took the page(s) [Intro]", warning, StringComparison.Ordinal)
        );
        Assert.Empty(result.Todos);
    }

    [Fact]
    public async Task LeavesATodoForThePagesOfAPdfTaskWithoutAPdfLayout()
    {
        // Without a pdfLayoutName, a v8 PDF task may have rendered the pages it lists
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        var settings = """{ "pages": { "order": ["Summary"] } }""";
        _app.Write("ui/PdfTask/Settings.json", settings);
        _app.Write("ui/PdfTask/layouts/Summary.json", """{ "data": { "layout": [] } }""");

        var result = await Migrate();

        Assert.Equal(settings, _app.Read("ui/PdfTask/Settings.json"));
        Assert.Empty(result.Warnings);
        Assert.Contains(
            "PDF task 'PdfTask' lists the page(s) [Summary]",
            Assert.Single(result.Todos),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task TakesEveryPageOutOfTheOrderOfASubformPdfTask()
    {
        // A subform PDF task's PDFs come from the subform's folder, so in v8 its pages showed only when it failed
        _app.Write(ProcessPath, Process(Task("Task_1", "data"), ServiceTask("SubformPdf", "subformPdf")));
        WriteTaskFolder("SubformPdf", """{ "pages": { "order": ["Failed", "ServiceTask"] } }""", DesignerPage());
        _app.Write("ui/SubformPdf/layouts/Failed.json", """{ "data": { "layout": [] } }""");

        var result = await Migrate();

        Assert.Equal("""{ "pages": { "order": [] } }""", _app.Read("ui/SubformPdf/Settings.json"));
        Assert.False(File.Exists(LayoutFile("SubformPdf", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("SubformPdf", "Failed")));
        Assert.Collection(
            result.Warnings,
            warning => Assert.Contains("Removed the page 'ServiceTask'", warning, StringComparison.Ordinal),
            warning =>
                Assert.Contains(
                    "Took the page(s) [Failed] out of pages.order in ui/SubformPdf",
                    warning,
                    StringComparison.Ordinal
                )
        );
        Assert.Empty(result.Todos);
    }

    [Fact]
    public async Task KeepsAGeneratedPageThatIsThePdfLayout()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        var settings = """{ "pages": { "pdfLayoutName": "ServiceTask", "order": ["ServiceTask"] } }""";
        WriteTaskFolder("PdfTask", settings, DesignerPage());

        var result = await Migrate();

        Assert.Equal(settings, _app.Read("ui/PdfTask/Settings.json"));
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
        Assert.Contains("[ServiceTask]", Assert.Single(result.Todos), StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesATodoForPagesInGroups()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        var settings = """{ "pages": { "pdfLayoutName": "PdfLayout", "groups": [{ "order": ["ServiceTask"] }] } }""";
        WriteTaskFolder("PdfTask", settings, DesignerPage());

        var result = await Migrate();

        Assert.Equal(settings, _app.Read("ui/PdfTask/Settings.json"));
        Assert.Contains("[ServiceTask]", Assert.Single(result.Todos), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("eFormidling")]
    [InlineData("fiksArkiv")]
    [InlineData("myCustomTask")]
    public async Task RemovesTheGeneratedPageAndLeavesATodoForTheOthersInAnyServiceTask(string taskType)
    {
        _app.Write(ProcessPath, Process(Task("Task_1", "data"), ServiceTask("Service", taskType)));
        WriteTaskFolder("Service", """{ "pages": { "order": ["Waiting", "ServiceTask"] } }""", DesignerPage());

        var result = await Migrate();

        Assert.Equal("""{ "pages": { "order": ["Waiting"] } }""", _app.Read("ui/Service/Settings.json"));
        Assert.False(File.Exists(LayoutFile("Service", "ServiceTask")));
        Assert.Contains(
            $"so Service task 'Service' ({taskType}) would have shown it",
            Assert.Single(result.Warnings),
            StringComparison.Ordinal
        );
        var todo = Assert.Single(result.Todos);
        Assert.Contains(
            $"Service task 'Service' ({taskType}) lists the page(s) [Waiting]",
            todo,
            StringComparison.Ordinal
        );
        Assert.Contains("read-only", todo, StringComparison.Ordinal);
        Assert.Contains("otherwise empty pages.order", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesATodoForTheGroupedPagesOfABuiltInServiceTaskWrittenAsATask()
    {
        _app.Write(ProcessPath, Process(Task("Arkiv", "fiksArkiv")));
        WriteTaskFolder("Arkiv", """{ "pages": { "groups": [{ "order": ["Waiting"] }] } }""", PreviewWaitingPage);

        var result = await Migrate();

        Assert.Contains("Service task 'Arkiv' (fiksArkiv) lists the page(s) [Waiting]", Assert.Single(result.Todos));
    }

    [Fact]
    public async Task LeavesUserTasksAndServiceTasksWithoutPagesAlone()
    {
        _app.Write(
            ProcessPath,
            Process(
                Task("Task_1", "data"),
                Task("Signing", "signing"),
                ServiceTask("EFormidling", "eFormidling"),
                ServiceTask("NoFolder", "eFormidling"),
                PdfServiceTask("AutoPdf"),
                PdfServiceTask("PdfTask")
            )
        );
        WriteTaskFolder("Task_1", Settings(), DesignerPage());
        WriteTaskFolder("Signing", Settings(), DesignerPage());
        WriteTaskFolder("EFormidling", """{ "pages": { "order": [] } }""", DesignerPage());
        WriteTaskFolder("PdfTask", Settings(order: ""), DesignerPage());

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.True(File.Exists(LayoutFile("Task_1", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("Signing", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("EFormidling", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
    }

    [Theory]
    [InlineData("subformPdf")]
    [InlineData("eFormidling")]
    public async Task RemovesAFolderLeftWithOnlyItsSettings(string taskType)
    {
        _app.Write(ProcessPath, Process(ServiceTask("Service", taskType)));
        _app.Write("ui/Service/Settings.json", """{ "pages": { "order": ["ServiceTask"] } }""");
        _app.Write("ui/Service/layouts/ServiceTask.json", $$"""{ "data": { "layout": [{{DesignerPage()}}] } }""");

        var result = await Migrate();

        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "Service")));
        Assert.Empty(result.Todos);
        Assert.Equal(2, result.Warnings.Count);
        Assert.StartsWith(
            "Removed ui/Service, which held only its settings",
            result.Warnings[1],
            StringComparison.Ordinal
        );
    }

    [Theory]
    [InlineData("""{ "pages": { "pdfLayoutName": "PdfLayout", "order": [] } }""", null)]
    [InlineData("""{ "pages": { "order": [] } }""", "layouts/Notes.json")]
    public async Task KeepsAFolderThatNamesAPdfLayoutOrHoldsMore(string settings, string? otherFile)
    {
        _app.Write(ProcessPath, Process(ServiceTask("Service", "subformPdf")));
        _app.Write("ui/Service/Settings.json", settings);
        if (otherFile is not null)
            _app.Write($"ui/Service/{otherFile}", """{ "data": { "layout": [] } }""");

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "Service", "Settings.json")));
    }

    [Fact]
    public async Task DoesNothingOnASecondRun()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        WriteTaskFolder("PdfTask", Settings(), DesignerPage());
        await Migrate();

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(Settings(order: ""), _app.Read("ui/PdfTask/Settings.json"));
    }

    [Fact]
    public async Task WaitsForTheLayoutSetConversion()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask"), ServiceTask("EFormidling", "eFormidling")));
        _app.Write("ui/layout-sets.json", """{ "sets": [] }""");
        WriteTaskFolder("PdfTask", Settings(), DesignerPage());

        var result = await Migrate();

        var todo = Assert.Single(result.Todos);
        Assert.Contains("[PdfTask, EFormidling]", todo, StringComparison.Ordinal);
        Assert.Contains("layout-sets.json", todo, StringComparison.Ordinal);
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
    }

    [Theory]
    [InlineData("pdf")]
    [InlineData("eFormidling")]
    public async Task LeavesATodoForUnreadableSettings(string taskType)
    {
        _app.Write(ProcessPath, Process(ServiceTask("Service", taskType)));
        WriteTaskFolder("Service", "{ not json", DesignerPage());

        var result = await Migrate();

        Assert.Contains(
            "Could not read ui/Service/Settings.json",
            Assert.Single(result.Todos),
            StringComparison.Ordinal
        );
        Assert.True(File.Exists(LayoutFile("Service", "ServiceTask")));
    }

    private string LayoutFile(string folder, string page) =>
        Path.Combine(_app.Root, "App", "ui", folder, "layouts", $"{page}.json");

    /// <summary>
    /// A task folder like the one Altinn Studio Designer creates for a PDF task: an empty PDF layout and a
    /// ServiceTask page holding <paramref name="components"/>. Null <paramref name="settings"/> leaves the settings
    /// as they are.
    /// </summary>
    private void WriteTaskFolder(string folder, string? settings, string components)
    {
        if (settings is not null)
            _app.Write($"ui/{folder}/Settings.json", settings);
        _app.Write($"ui/{folder}/layouts/PdfLayout.json", """{ "data": { "layout": [] } }""");
        _app.Write(
            $"ui/{folder}/layouts/ServiceTask.json",
            $$"""
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
              "data": { "layout": [{{components}}] }
            }
            """
        );
    }
}
