using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ServiceTaskPageMigrationTests : IDisposable
{
    private const string ProcessPath = "config/process/process.bpmn";

    /// <summary>The page Altinn Studio Designer generates for a PDF task, with the given heading type.</summary>
    private static string DesignerPage(string headingType = "Heading") =>
        $$"""
            { "size": "L", "id": "service-task-title", "type": "{{headingType}}", "textResourceBindings": { "title": "service_task_custom_pdf_default.title" } },
            { "id": "service-task-body", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.body" } },
            { "id": "service-task-help-text", "type": "Paragraph", "textResourceBindings": { "title": "service_task_custom_pdf_default.help_text" } },
            { "id": "service-task-button-group", "type": "ButtonGroup", "children": ["service-task-retry-button", "service-task-back-button"] },
            { "id": "service-task-retry-button", "type": "Button", "textResourceBindings": { "title": "service_task_custom_pdf_default.retry_button" } },
            { "id": "service-task-back-button", "type": "ActionButton", "textResourceBindings": { "title": "service_task_custom_pdf_default.back_button" }, "action": "reject", "buttonStyle": "secondary" }
            """;

    /// <summary>The waiting page earlier versions of the upgrade generated for the PDF tasks they added.</summary>
    private const string UpgradeWaitingPage = """
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

    public static TheoryData<string> GeneratedPages =>
        new(DesignerPage("Header"), DesignerPage("Heading"), UpgradeWaitingPage);

    [Theory]
    [MemberData(nameof(GeneratedPages))]
    public async Task RemovesThePageAltinnStudioGenerated(string components)
    {
        _app.Write(ProcessPath, Process(Task("Task_1", "data"), PdfServiceTask("PdfTask")));
        WriteTaskFolder("PdfTask", Settings(), components);

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

    [Theory]
    [InlineData("service_task_custom_pdf_default.title", "pdf.waiting.title")]
    [InlineData("\"buttonStyle\": \"secondary\"", "\"buttonStyle\": \"primary\"")]
    [InlineData(
        "{ \"id\": \"service-task-body\"",
        "{ \"id\": \"extra\", \"type\": \"Image\" },\n{ \"id\": \"service-task-body\""
    )]
    public async Task KeepsAChangedPageAndLeavesATodo(string generated, string changed)
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        WriteTaskFolder("PdfTask", Settings(), DesignerPage().Replace(generated, changed, StringComparison.Ordinal));

        var result = await Migrate();

        Assert.Equal(Settings(), _app.Read("ui/PdfTask/Settings.json"));
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("PDF task 'PdfTask' lists the page(s) [ServiceTask]", todo, StringComparison.Ordinal);
        Assert.Contains("keep pdfLayoutName", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemovesTheGeneratedPageAndLeavesATodoForTheOthers()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        WriteTaskFolder("PdfTask", Settings(order: "\"Intro\", \"ServiceTask\""), DesignerPage());
        _app.Write("ui/PdfTask/layouts/Intro.json", """{ "data": { "layout": [] } }""");

        var result = await Migrate();

        Assert.Equal(Settings(order: "\"Intro\""), _app.Read("ui/PdfTask/Settings.json"));
        Assert.False(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("PdfTask", "Intro")));
        Assert.Contains("Removed the page 'ServiceTask'", Assert.Single(result.Warnings), StringComparison.Ordinal);
        Assert.Contains("[Intro]", Assert.Single(result.Todos), StringComparison.Ordinal);
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
    public async Task LeavesATodoForThePagesOfOtherServiceTasks(string taskType)
    {
        _app.Write(ProcessPath, Process(Task("Task_1", "data"), ServiceTask("Service", taskType)));
        var settings = """{ "pages": { "order": ["Waiting", "ServiceTask"] } }""";
        WriteTaskFolder("Service", settings, DesignerPage());

        var result = await Migrate();

        Assert.Equal(settings, _app.Read("ui/Service/Settings.json"));
        Assert.True(File.Exists(LayoutFile("Service", "ServiceTask")));
        var todo = Assert.Single(result.Todos);
        Assert.Contains(
            $"Service task 'Service' ({taskType}) lists the page(s) [Waiting, ServiceTask]",
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
        WriteTaskFolder("Arkiv", """{ "pages": { "groups": [{ "order": ["Waiting"] }] } }""", UpgradeWaitingPage);

        var result = await Migrate();

        Assert.Contains("Service task 'Arkiv' (fiksArkiv) lists the page(s) [Waiting]", Assert.Single(result.Todos));
    }

    [Fact]
    public async Task LeavesUserTasksSubformPdfTasksAndServiceTasksWithoutPagesAlone()
    {
        _app.Write(
            ProcessPath,
            Process(
                Task("Task_1", "data"),
                Task("Signing", "signing"),
                ServiceTask("SubformPdf", "subformPdf"),
                ServiceTask("EFormidling", "eFormidling"),
                ServiceTask("NoFolder", "eFormidling"),
                PdfServiceTask("AutoPdf"),
                PdfServiceTask("PdfTask")
            )
        );
        WriteTaskFolder("Task_1", Settings(), DesignerPage());
        WriteTaskFolder("Signing", Settings(), DesignerPage());
        WriteTaskFolder("SubformPdf", Settings(), DesignerPage());
        WriteTaskFolder("EFormidling", """{ "pages": { "order": [] } }""", DesignerPage());
        WriteTaskFolder("PdfTask", Settings(order: ""), DesignerPage());

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.True(File.Exists(LayoutFile("Task_1", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("Signing", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("SubformPdf", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
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
