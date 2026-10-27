using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class PdfTaskPageMigrationTests : IDisposable
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

    private Task<MigrationResult> Migrate() => PdfTaskPageMigration.Migrate(_app.Root);

    public static TheoryData<string> GeneratedPages =>
        new(DesignerPage("Header"), DesignerPage("Heading"), UpgradeWaitingPage);

    [Theory]
    [MemberData(nameof(GeneratedPages))]
    public async Task RemovesThePageAltinnStudioGenerated(string components)
    {
        _app.Write(ProcessPath, Process(Task("Task_1", "data"), PdfServiceTask("PdfTask")));
        WritePdfTaskFolder("PdfTask", Settings(), components);

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
        WritePdfTaskFolder(
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
        WritePdfTaskFolder("PdfTask", Settings(), DesignerPage().Replace(generated, changed, StringComparison.Ordinal));

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
        WritePdfTaskFolder("PdfTask", Settings(order: "\"Intro\", \"ServiceTask\""), DesignerPage());
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
        WritePdfTaskFolder("PdfTask", settings, DesignerPage());

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
        WritePdfTaskFolder("PdfTask", settings, DesignerPage());

        var result = await Migrate();

        Assert.Equal(settings, _app.Read("ui/PdfTask/Settings.json"));
        Assert.Contains("[ServiceTask]", Assert.Single(result.Todos), StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesOtherTasksAndPdfTasksWithoutPagesAlone()
    {
        _app.Write(
            ProcessPath,
            Process(
                Task("Task_1", "data"),
                ServiceTask("EFormidling", "eFormidling"),
                ServiceTask("SubformPdf", "subformPdf"),
                PdfServiceTask("AutoPdf"),
                PdfServiceTask("PdfTask")
            )
        );
        WritePdfTaskFolder("Task_1", Settings(), DesignerPage());
        WritePdfTaskFolder("EFormidling", Settings(), DesignerPage());
        WritePdfTaskFolder("SubformPdf", Settings(), DesignerPage());
        WritePdfTaskFolder("PdfTask", Settings(order: ""), DesignerPage());

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.True(File.Exists(LayoutFile("Task_1", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("EFormidling", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("SubformPdf", "ServiceTask")));
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
    }

    [Fact]
    public async Task DoesNothingOnASecondRun()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        WritePdfTaskFolder("PdfTask", Settings(), DesignerPage());
        await Migrate();

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(Settings(order: ""), _app.Read("ui/PdfTask/Settings.json"));
    }

    [Fact]
    public async Task WaitsForTheLayoutSetConversion()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        _app.Write("ui/layout-sets.json", """{ "sets": [] }""");
        WritePdfTaskFolder("PdfTask", Settings(), DesignerPage());

        var result = await Migrate();

        Assert.Contains("layout-sets.json", Assert.Single(result.Todos), StringComparison.Ordinal);
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
    }

    [Fact]
    public async Task LeavesATodoForUnreadableSettings()
    {
        _app.Write(ProcessPath, Process(PdfServiceTask("PdfTask")));
        WritePdfTaskFolder("PdfTask", "{ not json", DesignerPage());

        var result = await Migrate();

        Assert.Contains("ui/PdfTask/Settings.json", Assert.Single(result.Todos), StringComparison.Ordinal);
        Assert.True(File.Exists(LayoutFile("PdfTask", "ServiceTask")));
    }

    private string LayoutFile(string folder, string page) =>
        Path.Combine(_app.Root, "App", "ui", folder, "layouts", $"{page}.json");

    /// <summary>
    /// A PDF task's folder as Altinn Studio Designer creates it: an empty PDF layout and a ServiceTask page
    /// holding <paramref name="components"/>. Null <paramref name="settings"/> leaves the settings as they are.
    /// </summary>
    private void WritePdfTaskFolder(string folder, string? settings, string components)
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
