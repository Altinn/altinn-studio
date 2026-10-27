using System.Collections.Immutable;
using System.Text;
using Altinn.App.Analyzers.Process;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Process;

public class PdfServiceTaskUtilsTests
{
    private const string AppRoot = "/repo/App/";
    private const string ProcessPath = AppRoot + "config/process/process.bpmn";

    private const string NothingToRender = "ALTINNAPP1000";
    private const string EntryAddsNothing = "ALTINNAPP1002";
    private const string SubformUiFolderCannotRender = "ALTINNAPP1024";
    private const string PdfLayoutNotFound = "ALTINNAPP1026";
    private const string MetadataPath = AppRoot + "config/applicationmetadata.json";

    [Fact]
    public void Listing_Tasks_With_UI_Folders_Is_Valid()
    {
        var diagnostics = Collect(
            Process(PdfTask("PdfTask", "Task_1", "Task_2")),
            UiFolder("Task_1"),
            UiFolder("Task_2")
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Own_UI_Folder_With_PdfLayoutName_Is_Valid_Without_AutoPdfTaskIds()
    {
        var diagnostics = Collect(
            Process(PdfTask("PdfTask")),
            UiFolder("Task_1"),
            UiFolder("PdfTask", pdfLayoutName: "PdfLayout"),
            Layout("PdfTask", "PdfLayout")
        );

        Assert.Empty(diagnostics);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Task_1")]
    [InlineData("PdfTask", "pdfLayout")]
    [InlineData("PdfTask", " PdfLayout")]
    public void PdfLayoutName_Without_Its_Layout_In_The_Own_UI_Folder_Is_An_Error(
        string? layoutFolder,
        string layoutPage = "PdfLayout"
    )
    {
        // The frontend looks the layout up by its exact name among the PDF task folder's layouts
        AdditionalText[] files = layoutFolder is null
            ? [UiFolder("Task_1"), UiFolder("PdfTask", pdfLayoutName: "PdfLayout")]
            : [UiFolder("Task_1"), UiFolder("PdfTask", pdfLayoutName: "PdfLayout"), Layout(layoutFolder, layoutPage)];

        var diagnostics = Collect(Process(PdfTask("PdfTask", "Task_1")), files);

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(PdfLayoutNotFound, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Contains("'ui/PdfTask/layouts/PdfLayout.json'", diagnostic.GetMessage());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public void Own_UI_Folder_Without_PdfLayoutName_Or_AutoPdfTaskIds_Has_Nothing_To_Render(string? pdfLayoutName)
    {
        // The folder's pages are what people see while the process is at the task, never the PDF.
        var diagnostics = Collect(Process(PdfTask("PdfTask")), UiFolder("Task_1"), UiFolder("PdfTask", pdfLayoutName));

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(NothingToRender, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Contains("'ui/PdfTask/Settings.json'", diagnostic.GetMessage());
    }

    [Fact]
    public void No_AutoPdfTaskIds_And_No_Own_UI_Folder_Has_Nothing_To_Render()
    {
        // The setup from Altinn/altinn-studio#19425: pdfLayoutName on the data task is not used by the PDF
        // service task, which then has nothing to render.
        var diagnostics = Collect(Process(PdfTask("PdfTask")), UiFolder("Task_1", pdfLayoutName: "PdfLayout"));

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(NothingToRender, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Contains("'PdfTask'", diagnostic.GetMessage());
        Assert.Contains("'ui/PdfTask/Settings.json'", diagnostic.GetMessage());
    }

    [Fact]
    public void Blank_AutoPdfTaskIds_Entries_Do_Not_Count_As_Listed_Tasks()
    {
        var diagnostics = Collect(Process(PdfTask("PdfTask", " ")), UiFolder("Task_1"));

        Assert.Equal(NothingToRender, Assert.Single(diagnostics).Id);
    }

    [Fact]
    public void A_Blank_Entry_Next_To_Listed_Tasks_Is_A_Warning()
    {
        var diagnostics = Collect(Process(PdfTask("PdfTask", "Task_1", " ")), UiFolder("Task_1"));

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(EntryAddsNothing, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.Contains("lists a blank task id", diagnostic.GetMessage());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Listing_Itself_Is_A_Warning(bool hasOwnUiFolder)
    {
        // The PDF task's own folder holds its waiting page, which is never PDF content
        AdditionalText[] uiFolders = hasOwnUiFolder ? [UiFolder("Task_1"), UiFolder("PdfTask")] : [UiFolder("Task_1")];

        var diagnostics = Collect(Process(PdfTask("PdfTask", "Task_1", "PdfTask")), uiFolders);

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(EntryAddsNothing, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.Contains("'PdfTask' lists itself", diagnostic.GetMessage());
    }

    [Fact]
    public void Own_UI_Folder_Without_PdfLayoutName_Renders_AutoPdfTaskIds()
    {
        // Without pdfLayoutName the PDF is generated from the listed tasks, as if the folder were missing.
        var diagnostics = Collect(Process(PdfTask("PdfTask", "Task_1")), UiFolder("Task_1"), UiFolder("PdfTask"));

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Own_UI_Folder_Without_PdfLayoutName_Checks_The_Listed_Tasks()
    {
        var diagnostics = Collect(
            Process(PdfTask("PdfTask", "Task_1", "Task_9")),
            UiFolder("Task_1"),
            UiFolder("PdfTask")
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(EntryAddsNothing, diagnostic.Id);
        Assert.Contains("'Task_9'", diagnostic.GetMessage());
    }

    [Fact]
    public void AutoPdfTaskIds_Are_Ignored_When_Own_UI_Folder_Has_PdfLayoutName()
    {
        // The frontend renders the custom layout and never looks at the listed tasks, so even an unknown one
        // is not reported.
        var diagnostics = Collect(
            Process(PdfTask("PdfTask", "Task_9")),
            UiFolder("Task_1"),
            UiFolder("PdfTask", pdfLayoutName: "PdfLayout"),
            Layout("PdfTask", "PdfLayout")
        );

        Assert.Empty(diagnostics);
    }

    [Theory]
    [InlineData("pages", "pdfLayoutName")]
    [InlineData("Pages", "pdfLayoutName")]
    [InlineData("pages", "PdfLayoutName")]
    [InlineData("Pages", "PdfLayoutName")]
    public void PdfLayoutName_Is_Read_Ignoring_Case_Like_The_Backend(string pagesProperty, string pdfLayoutNameProperty)
    {
        // The backend deserializes Settings.json case-insensitively and hands the result to the frontend, so every
        // spelling renders the custom layout, and the listed tasks are ignored.
        var diagnostics = Collect(
            Process(PdfTask("PdfTask", "Task_1")),
            UiFolder("Task_1"),
            new InMemoryAdditionalText(
                AppRoot + "ui/PdfTask/Settings.json",
                $$"""{ "{{pagesProperty}}": { "order": ["Page1"], "{{pdfLayoutNameProperty}}": "PdfLayout" } }"""
            ),
            Layout("PdfTask", "PdfLayout")
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Unreadable_Own_Settings_Are_Not_Reported()
    {
        var diagnostics = Collect(
            Process(PdfTask("PdfTask", "Task_1")),
            UiFolder("Task_1"),
            new InMemoryAdditionalText(AppRoot + "ui/PdfTask/Settings.json", "{ not json")
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Listed_Task_Without_UI_Folder_Is_A_Warning()
    {
        var diagnostics = Collect(Process(PdfTask("PdfTask", "Task_1", "Task_2")), UiFolder("Task_1"));

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(EntryAddsNothing, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.Contains("'Task_2'", diagnostic.GetMessage());
    }

    [Fact]
    public void Only_Direct_Subfolders_Of_Ui_With_Settings_Are_UI_Folders()
    {
        // ui/Settings.json holds the global settings, and a Settings.json deeper down is not a folder's
        // settings - neither makes 'Task_1' a UI folder.
        var diagnostics = Collect(
            Process(PdfTask("PdfTask", "Task_1")),
            UiFolder("Task_2"),
            new InMemoryAdditionalText(AppRoot + "ui/Settings.json", Settings(null)),
            new InMemoryAdditionalText(AppRoot + "ui/Task_1/layouts/Settings.json", Settings(null))
        );

        Assert.Equal(EntryAddsNothing, Assert.Single(diagnostics).Id);
    }

    [Fact]
    public void UI_Folders_Of_Another_App_Do_Not_Count()
    {
        var diagnostics = Collect(
            Process(PdfTask("PdfTask", "Task_1")),
            UiFolder("Task_2"),
            new InMemoryAdditionalText("/other/App/ui/Task_1/Settings.json", Settings(null))
        );

        Assert.Equal(EntryAddsNothing, Assert.Single(diagnostics).Id);
    }

    [Fact]
    public void An_App_Without_UI_Folders_Is_Still_Checked()
    {
        var diagnostic = Assert.Single(Collect(Process(PdfTask("PdfTask"))));

        Assert.Equal(NothingToRender, diagnostic.Id);
    }

    [Fact]
    public void Other_Service_Task_Types_Are_Not_Checked()
    {
        var diagnostics = Collect(Process(ServiceTask("Send", "eFormidling")), UiFolder("Task_1"));

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Subform_Pdf_Task_Naming_A_Folder_With_A_Declared_Default_Data_Type_Is_Valid()
    {
        // The subform PDF task needs no UI folder of its own
        var diagnostics = Collect(
            Process(SubformPdfTask("SubformPdf", "Subform")),
            SubformFolder("Subform", "vehicle"),
            Metadata("vehicle")
        );

        Assert.Empty(diagnostics);
    }

    [Theory]
    [InlineData("Unknown", "the app has no UI folder 'ui/Unknown' with a Settings.json")]
    // Folder names are matched exactly, like the app backend.
    [InlineData("subform", "the app has no UI folder 'ui/subform' with a Settings.json")]
    public void Subform_Pdf_Task_Naming_A_Folder_That_Does_Not_Exist_Is_An_Error(string uiFolder, string problem)
    {
        var process = Process(SubformPdfTask("SubformPdf", uiFolder));

        var diagnostic = Assert.Single(Collect(process, SubformFolder("Subform", "vehicle"), Metadata("vehicle")));

        Assert.Equal(SubformUiFolderCannotRender, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Equal(
            $"Subform PDF service task 'SubformPdf' renders the subform UI folder '{uiFolder}' named in "
                + $"<altinn:subformPdfConfig><altinn:subformUiFolder>, but {problem}, so the app does not start. "
                + "Name the UI folder that holds the subform's pages.",
            diagnostic.GetMessage()
        );
        Assert.Equal("<bpmn:serviceTask", process.Substring(diagnostic.Location.SourceSpan.Start, 17));
    }

    [Theory]
    [InlineData("""{ "pages": { "order": ["Page1"] } }""")]
    [InlineData("""{ "defaultDataType": " ", "pages": { "order": ["Page1"] } }""")]
    [InlineData("""{ "defaultDataType": 1, "pages": { "order": ["Page1"] } }""")]
    public void Subform_Pdf_Task_Naming_A_Folder_Without_A_Default_Data_Type_Is_An_Error(string settings)
    {
        var diagnostics = Collect(
            Process(SubformPdfTask("SubformPdf", "Subform")),
            new InMemoryAdditionalText(AppRoot + "ui/Subform/Settings.json", settings),
            Metadata("vehicle")
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(SubformUiFolderCannotRender, diagnostic.Id);
        Assert.Contains("but 'ui/Subform/Settings.json' has no defaultDataType", diagnostic.GetMessage());
    }

    [Fact]
    public void Subform_Pdf_Task_Naming_A_Folder_Whose_Data_Type_Is_Not_Declared_Is_An_Error()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask("SubformPdf", "Subform")),
            SubformFolder("Subform", "vehicle"),
            Metadata("model")
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(SubformUiFolderCannotRender, diagnostic.Id);
        Assert.Contains(
            "but its defaultDataType 'vehicle' is not a data type in applicationmetadata.json",
            diagnostic.GetMessage()
        );
    }

    [Fact]
    public void Subform_Default_Data_Type_Is_Read_Ignoring_Case_And_Not_Checked_Without_Metadata()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask("SubformPdf", "Subform")),
            new InMemoryAdditionalText(AppRoot + "ui/Subform/Settings.json", """{ "DefaultDataType": "vehicle" }""")
        );

        Assert.Empty(diagnostics);
    }

    [Theory]
    // A missing or blank subformUiFolder is ALTINNAPP1020's.
    [InlineData("")]
    [InlineData("<altinn:subformPdfConfig />")]
    [InlineData(
        "<altinn:subformPdfConfig><altinn:subformUiFolder> </altinn:subformUiFolder></altinn:subformPdfConfig>"
    )]
    public void Subform_Pdf_Task_Without_A_Ui_Folder_Setting_Is_Left_To_The_Task_Configuration_Check(string config)
    {
        var diagnostics = Collect(Process(ServiceTask("SubformPdf", "subformPdf", config)), Metadata("vehicle"));

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Unreadable_Subform_Folder_Settings_Are_Not_Reported()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask("SubformPdf", "Subform")),
            new InMemoryAdditionalText(AppRoot + "ui/Subform/Settings.json", "{ not json"),
            Metadata("vehicle")
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Each_Pdf_Task_Is_Checked()
    {
        var diagnostics = Collect(
            Process(PdfTask("PdfTask_1"), PdfTask("PdfTask_2", "Task_1"), PdfTask("PdfTask_3")),
            UiFolder("Task_1")
        );

        Assert.Equal(["PdfTask_1", "PdfTask_3"], diagnostics.Select(d => d.GetMessage().Split('\'')[1]));
        Assert.All(diagnostics, d => Assert.Equal(NothingToRender, d.Id));
    }

    [Fact]
    public void Invalid_Process_Is_Ignored()
    {
        Assert.Empty(Collect("<bpmn:definitions", UiFolder("Task_1")));
    }

    [Fact]
    public void Diagnostics_Point_At_The_Service_Task_Element()
    {
        var process = Process(PdfTask("PdfTask"));

        var location = Assert.Single(Collect(process, UiFolder("Task_1"))).Location;

        Assert.Equal(ProcessPath, location.GetLineSpan().Path);
        Assert.Equal("<bpmn:serviceTask", process.Substring(location.SourceSpan.Start, location.SourceSpan.Length));
    }

    [Fact]
    public void A_Pdf_Task_On_A_Task_Element_Is_Checked_Too()
    {
        // ALTINNAPP1003 reports the element; checking the configuration as well means changing the element does not
        // uncover a second error.
        var process = Process(PdfTask("PdfTask").Replace("bpmn:serviceTask", "bpmn:task"));

        var diagnostic = Assert.Single(Collect(process, UiFolder("Task_1")));

        Assert.Equal(NothingToRender, diagnostic.Id);
        Assert.Contains("'PdfTask'", diagnostic.GetMessage());
        Assert.Equal(
            "<bpmn:task",
            process.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length)
        );
        Assert.Equal(11, diagnostic.Location.GetLineSpan().StartLinePosition.Line);
    }

    [Fact]
    public void Windows_Paths_Are_Recognized()
    {
        // The warning for Task_2 needs both the process file and the Task_1 folder to be found; missing either
        // would leave the analysis quiet.
        var files = ImmutableArray.Create<AdditionalText>(
            new InMemoryAdditionalText(
                @"C:\repo\App\config\process\process.bpmn",
                Process(PdfTask("PdfTask", "Task_1", "Task_2"))
            ),
            new InMemoryAdditionalText(@"C:\repo\App\ui\Task_1\Settings.json", Settings(null))
        );
        var diagnostics = new List<Diagnostic>();

        PdfServiceTaskUtils.CollectDiagnostics(files, CancellationToken.None, diagnostics);

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(EntryAddsNothing, diagnostic.Id);
        Assert.Contains("'Task_2'", diagnostic.GetMessage());
    }

    private static List<Diagnostic> Collect(string process, params AdditionalText[] uiFiles)
    {
        var files = ImmutableArray.CreateBuilder<AdditionalText>();
        files.Add(new InMemoryAdditionalText(ProcessPath, process));
        files.AddRange(uiFiles);

        var diagnostics = new List<Diagnostic>();
        PdfServiceTaskUtils.CollectDiagnostics(files.ToImmutable(), CancellationToken.None, diagnostics);
        return diagnostics;
    }

    private static AdditionalText SubformFolder(string folder, string defaultDataType) =>
        new InMemoryAdditionalText(
            AppRoot + $"ui/{folder}/Settings.json",
            $$"""{ "defaultDataType": "{{defaultDataType}}", "pages": { "order": ["Page1"] } }"""
        );

    private static AdditionalText Metadata(params string[] dataTypes) =>
        new InMemoryAdditionalText(
            MetadataPath,
            $$"""{ "id": "ttd/app", "org": "ttd", "dataTypes": [{{string.Join(
                ", ",
                dataTypes.Select(id => $$"""{ "id": "{{id}}" }""")
            )}}] }"""
        );

    /// <summary>A subform PDF service task as the Studio process editor writes it.</summary>
    private static string SubformPdfTask(string id, string uiFolder) =>
        ServiceTask(
            id,
            "subformPdf",
            $"<altinn:subformPdfConfig><altinn:filenameTextResourceKey>name</altinn:filenameTextResourceKey><altinn:subformUiFolder>{uiFolder}</altinn:subformUiFolder></altinn:subformPdfConfig>"
        );

    private static AdditionalText UiFolder(string folder, string? pdfLayoutName = null) =>
        new InMemoryAdditionalText(AppRoot + $"ui/{folder}/Settings.json", Settings(pdfLayoutName));

    private static AdditionalText Layout(string folder, string page) =>
        new InMemoryAdditionalText(AppRoot + $"ui/{folder}/layouts/{page}.json", """{ "data": { "layout": [] } }""");

    private static string Settings(string? pdfLayoutName) =>
        pdfLayoutName is null
            ? """{ "pages": { "order": ["Page1"] } }"""
            : $$"""{ "pages": { "order": ["Page1"], "pdfLayoutName": "{{pdfLayoutName}}" } }""";

    /// <summary>A PDF service task as the Studio process editor writes it.</summary>
    private static string PdfTask(string id, params string[] autoPdfTaskIds)
    {
        var taskIds = new StringBuilder();
        foreach (var taskId in autoPdfTaskIds)
        {
            taskIds.Append($"<altinn:taskId>{taskId}</altinn:taskId>");
        }

        var autoPdfTaskIdsXml =
            autoPdfTaskIds.Length == 0 ? "" : $"<altinn:autoPdfTaskIds>{taskIds}</altinn:autoPdfTaskIds>";
        return ServiceTask(
            id,
            "pdf",
            $"<altinn:pdfConfig><altinn:filenameTextResourceKey>pdfFileName</altinn:filenameTextResourceKey>{autoPdfTaskIdsXml}</altinn:pdfConfig>"
        );
    }

    private static string ServiceTask(string id, string taskType, string config = "") =>
        $"""
                <bpmn:serviceTask id="{id}" name="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>{taskType}</altinn:taskType>
                      {config}
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:serviceTask>

            """;

    private static string Process(params string[] serviceTasks) =>
        $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions_1">
              <bpmn:process id="Altinn_Process_Definition" isExecutable="true">
                <bpmn:startEvent id="StartEvent_1" />
                <bpmn:task id="Task_1">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>data</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
            {string.Concat(serviceTasks)}    <bpmn:endEvent id="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """;
}
