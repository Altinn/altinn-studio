using System.Collections.Immutable;
using System.Text;
using Altinn.App.Analyzers.Process;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Process;

public class SubformPdfServiceTaskUtilsTests
{
    private const string AppRoot = "/repo/App/";
    private const string ProcessPath = AppRoot + "config/process/process.bpmn";

    private const string Incomplete = "ALTINNAPP1003";
    private const string ComponentNotFound = "ALTINNAPP1004";
    private const string DataTypeMismatch = "ALTINNAPP1005";

    private const string SubformPdfTaskId = "SubformPdf";
    private const string SubformComponentId = "Subform";
    private const string SubformFolder = "SubformLayouts";
    private const string SubformDataType = "SubformModel";

    [Fact]
    public void Subform_Component_In_Own_UI_Folder_With_Matching_Data_Type_Is_Valid()
    {
        var diagnostics = Collect(Process(SubformPdfTask()), ValidUiFolders());

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Component_Type_Is_Matched_Ignoring_Case_Like_The_Backend()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder(SubformPdfTaskId, layout: Component(SubformComponentId, "subform", SubformFolder)),
            Folder(SubformFolder, defaultDataType: SubformDataType)
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Missing_Subform_Pdf_Config_Is_Incomplete()
    {
        var diagnostics = Collect(Process(ServiceTask(SubformPdfTaskId, config: "")), ValidUiFolders());

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(Incomplete, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Contains("has no <altinn:subformPdfConfig>", diagnostic.GetMessage());
    }

    [Fact]
    public void Each_Missing_Or_Blank_Config_Value_Is_Reported()
    {
        var diagnostics = Collect(Process(SubformPdfTask(componentId: " ", dataTypeId: null)), ValidUiFolders());

        Assert.Equal([Incomplete, Incomplete], diagnostics.Select(d => d.Id));
        Assert.Contains("has no <altinn:subformComponentId>", diagnostics[0].GetMessage());
        Assert.Contains("has no <altinn:subformDataTypeId>", diagnostics[1].GetMessage());
    }

    [Fact]
    public void No_Own_UI_Folder_Means_The_Component_Cannot_Be_Found()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder("Task_1", layout: Component(SubformComponentId, "Subform", SubformFolder)),
            Folder(SubformFolder, defaultDataType: SubformDataType)
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(ComponentNotFound, diagnostic.Id);
        Assert.Contains("there is no UI folder 'ui/SubformPdf'", diagnostic.GetMessage());
    }

    [Fact]
    public void Component_Only_In_The_Data_Task_Folder_Is_Not_Found()
    {
        // The component lives where the user fills in the form, but the frontend looks it up in the PDF task's
        // own folder.
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder("Task_1", layout: Component(SubformComponentId, "Subform", SubformFolder)),
            Folder(SubformPdfTaskId, layout: Component("Header", "Header")),
            Folder(SubformFolder, defaultDataType: SubformDataType)
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(ComponentNotFound, diagnostic.Id);
        Assert.Contains("no layout in 'ui/SubformPdf' has a component with that id", diagnostic.GetMessage());
    }

    [Fact]
    public void Component_That_Is_Not_A_Subform_Is_Reported()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder(SubformPdfTaskId, layout: Component(SubformComponentId, "Input")),
            Folder(SubformFolder, defaultDataType: SubformDataType)
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(ComponentNotFound, diagnostic.Id);
        Assert.Contains("it is a 'Input' component, not a Subform component", diagnostic.GetMessage());
    }

    [Fact]
    public void Subform_Component_Without_LayoutSet_Is_Reported()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder(SubformPdfTaskId, layout: Component(SubformComponentId, "Subform"))
        );

        Assert.Contains("the Subform component has no layoutSet", Assert.Single(diagnostics).GetMessage());
    }

    [Fact]
    public void LayoutSet_That_Is_Not_A_UI_Folder_Is_Reported()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder(SubformPdfTaskId, layout: Component(SubformComponentId, "Subform", "Missing"))
        );

        Assert.Contains("its layoutSet 'Missing' is not a UI folder", Assert.Single(diagnostics).GetMessage());
    }

    [Fact]
    public void LayoutSet_Without_DefaultDataType_Is_Reported()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder(SubformPdfTaskId, layout: Component(SubformComponentId, "Subform", SubformFolder)),
            Folder(SubformFolder)
        );

        Assert.Contains(
            "its layoutSet 'SubformLayouts' has no defaultDataType",
            Assert.Single(diagnostics).GetMessage()
        );
    }

    [Fact]
    public void Data_Type_Other_Than_The_Subforms_Is_Reported()
    {
        var diagnostics = Collect(Process(SubformPdfTask(dataTypeId: "OtherModel")), ValidUiFolders());

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(DataTypeMismatch, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Contains("data type 'OtherModel'", diagnostic.GetMessage());
        Assert.Contains(
            "shows data type 'SubformModel' (the defaultDataType of 'ui/SubformLayouts')",
            diagnostic.GetMessage()
        );
    }

    [Fact]
    public void Settings_Properties_Are_Read_Ignoring_Case_Like_The_Backend()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder(SubformPdfTaskId, layout: Component(SubformComponentId, "Subform", SubformFolder)),
            [
                new InMemoryAdditionalText(
                    AppRoot + $"ui/{SubformFolder}/Settings.json",
                    $$"""{ "DefaultDataType": "{{SubformDataType}}", "pages": { "order": ["Page1"] } }"""
                ),
            ]
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void An_Unreadable_Page_Keeps_A_Missing_Component_Unreported()
    {
        // The unreadable page might hold the component.
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder(SubformPdfTaskId, layout: Component("Header", "Header")),
            [new InMemoryAdditionalText(AppRoot + $"ui/{SubformPdfTaskId}/layouts/Broken.json", "{ not json")],
            Folder(SubformFolder, defaultDataType: SubformDataType)
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Unreadable_Subform_Settings_Are_Not_Reported()
    {
        var diagnostics = Collect(
            Process(SubformPdfTask()),
            Folder(SubformPdfTaskId, layout: Component(SubformComponentId, "Subform", SubformFolder)),
            [new InMemoryAdditionalText(AppRoot + $"ui/{SubformFolder}/Settings.json", "{ not json")]
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Diagnostics_Point_At_The_Service_Task_Element()
    {
        var process = Process(SubformPdfTask(dataTypeId: "OtherModel"));

        var location = Assert.Single(Collect(process, ValidUiFolders())).Location;

        Assert.Equal(ProcessPath, location.GetLineSpan().Path);
        Assert.Equal("<bpmn:serviceTask", process.Substring(location.SourceSpan.Start, location.SourceSpan.Length));
    }

    private static AdditionalText[] ValidUiFolders() =>
        [
            .. Folder("Task_1", layout: Component(SubformComponentId, "Subform", SubformFolder)),
            .. Folder(SubformPdfTaskId, layout: Component(SubformComponentId, "Subform", SubformFolder)),
            .. Folder(SubformFolder, defaultDataType: SubformDataType),
        ];

    private static List<Diagnostic> Collect(string process, params IEnumerable<AdditionalText>[] uiFiles)
    {
        var files = ImmutableArray.CreateBuilder<AdditionalText>();
        files.Add(new InMemoryAdditionalText(ProcessPath, process));
        foreach (var group in uiFiles)
        {
            files.AddRange(group);
        }

        var diagnostics = new List<Diagnostic>();
        PdfServiceTaskUtils.CollectDiagnostics(files.ToImmutable(), CancellationToken.None, diagnostics);
        return diagnostics;
    }

    /// <summary>A UI folder's Settings.json and, when given, one layout page.</summary>
    private static AdditionalText[] Folder(string folder, string? defaultDataType = null, string? layout = null)
    {
        var dataType = defaultDataType is null ? "" : $"\"defaultDataType\": \"{defaultDataType}\", ";
        var settings = new InMemoryAdditionalText(
            AppRoot + $"ui/{folder}/Settings.json",
            $$"""{ {{dataType}}"pages": { "order": ["Page1"] } }"""
        );

        return layout is null
            ? [settings]
            : [settings, new InMemoryAdditionalText(AppRoot + $"ui/{folder}/layouts/Page1.json", layout)];
    }

    private static string Component(string id, string type, string? layoutSet = null)
    {
        var layoutSetProperty = layoutSet is null ? "" : $", \"layoutSet\": \"{layoutSet}\"";
        return $$"""{ "data": { "layout": [ { "id": "{{id}}", "type": "{{type}}"{{layoutSetProperty}} } ] } }""";
    }

    private static string SubformPdfTask(string? componentId = SubformComponentId, string? dataTypeId = SubformDataType)
    {
        var config = new StringBuilder("<altinn:subformPdfConfig>");
        if (componentId is not null)
        {
            config.Append($"<altinn:subformComponentId>{componentId}</altinn:subformComponentId>");
        }

        if (dataTypeId is not null)
        {
            config.Append($"<altinn:subformDataTypeId>{dataTypeId}</altinn:subformDataTypeId>");
        }

        config.Append("</altinn:subformPdfConfig>");
        return ServiceTask(SubformPdfTaskId, config.ToString());
    }

    private static string ServiceTask(string id, string config) =>
        $"""
                <bpmn:serviceTask id="{id}" name="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>subformPdf</altinn:taskType>
                      {config}
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:serviceTask>

            """;

    private static string Process(string serviceTask) =>
        $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions_1">
              <bpmn:process id="Altinn_Process_Definition" isExecutable="true">
                <bpmn:startEvent id="StartEvent_1" />
            {serviceTask}    <bpmn:endEvent id="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """;
}
