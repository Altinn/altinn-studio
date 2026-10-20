using System.Collections.Immutable;
using Altinn.App.Analyzers.Process;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Process;

public class ProcessTaskElementUtilsTests
{
    private const string ProcessPath = "/repo/App/config/process/process.bpmn";
    private const string DiagnosticId = "ALTINNAPP1003";

    [Theory]
    [InlineData("pdf")]
    [InlineData("subformPdf")]
    [InlineData("eFormidling")]
    [InlineData("fiksArkiv")]
    public void Built_In_Service_Task_On_Task_Element_Is_An_Error(string taskType)
    {
        var diagnostic = Assert.Single(Collect(Process(Task("Task_2", taskType))));

        Assert.Equal(DiagnosticId, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Equal(
            $"Task 'Task_2' declares <altinn:taskType>{taskType}</altinn:taskType>, which is a service task, "
                + "but is a <bpmn:task> element. Change it to a <bpmn:serviceTask> element.",
            diagnostic.GetMessage()
        );
    }

    [Theory]
    [InlineData("data")]
    [InlineData("confirmation")]
    [InlineData("feedback")]
    [InlineData("signing")]
    [InlineData("payment")]
    public void Built_In_Process_Task_On_Service_Task_Element_Is_An_Error(string taskType)
    {
        var diagnostic = Assert.Single(Collect(Process(ServiceTask("Task_2", taskType))));

        Assert.Equal(DiagnosticId, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Equal(
            $"Task 'Task_2' declares <altinn:taskType>{taskType}</altinn:taskType>, which is not a service task, "
                + "but is a <bpmn:serviceTask> element. Change it to a <bpmn:task> element.",
            diagnostic.GetMessage()
        );
    }

    [Theory]
    [InlineData("pdf")]
    [InlineData("subformPdf")]
    [InlineData("eFormidling")]
    [InlineData("fiksArkiv")]
    public void Built_In_Service_Task_On_Service_Task_Element_Is_Valid(string taskType)
    {
        Assert.Empty(Collect(Process(ServiceTask("Task_2", taskType))));
    }

    [Theory]
    [InlineData("data")]
    [InlineData("confirmation")]
    [InlineData("feedback")]
    [InlineData("signing")]
    [InlineData("payment")]
    public void Built_In_Process_Task_On_Task_Element_Is_Valid(string taskType)
    {
        Assert.Empty(Collect(Process(Task("Task_2", taskType))));
    }

    [Fact]
    public void App_Service_Task_Is_Checked_Both_Ways()
    {
        var diagnostics = Collect(
            Process(Task("Task_2", "fetchNote"), ServiceTask("Task_3", "fetchNote")),
            appServiceTaskTypes: ["fetchNote"]
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Contains("'Task_2'", diagnostic.GetMessage());
        Assert.Contains("which is a service task", diagnostic.GetMessage());
    }

    [Fact]
    public void App_Process_Task_Is_Checked_Both_Ways()
    {
        var diagnostics = Collect(
            Process(Task("Task_2", "review"), ServiceTask("Task_3", "review")),
            appProcessTaskTypes: ["review"]
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Contains("'Task_3'", diagnostic.GetMessage());
        Assert.Contains("which is not a service task", diagnostic.GetMessage());
    }

    [Fact]
    public void An_App_Service_Task_Wins_Over_An_App_Process_Task_Of_The_Same_Type()
    {
        var diagnostics = Collect(
            Process(ServiceTask("Task_2", "review")),
            appServiceTaskTypes: ["review"],
            appProcessTaskTypes: ["review"]
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void An_App_Service_Task_Named_Like_A_Built_In_Process_Task_Is_Ignored()
    {
        // The class may never be registered, so the built-in classification governs: Task_1 (data on bpmn:task) stays
        // valid and Task_2 (data on bpmn:serviceTask) is reported.
        var diagnostic = Assert.Single(Collect(Process(ServiceTask("Task_2", "data")), appServiceTaskTypes: ["data"]));

        Assert.Contains("'Task_2'", diagnostic.GetMessage());
        Assert.Contains("which is not a service task", diagnostic.GetMessage());
    }

    [Theory]
    [InlineData("pdf")]
    [InlineData("fiksArkiv")]
    public void An_App_Process_Task_Named_Like_A_Built_In_Service_Task_Is_Ignored(string taskType)
    {
        // fiksArkiv is a built-in only once AddFiksArkiv() is called, which the build cannot see; the startup check
        // reports the type if it resolves to the app's process task instead.
        var diagnostics = Collect(
            Process(Task("Task_2", taskType), ServiceTask("Task_3", taskType)),
            appProcessTaskTypes: [taskType]
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Contains("'Task_2'", diagnostic.GetMessage());
        Assert.Contains("which is a service task", diagnostic.GetMessage());
    }

    [Theory]
    [InlineData("fetchNote")]
    [InlineData("PDF")]
    [InlineData(" pdf ")]
    public void Unknown_Types_Are_Left_To_The_Startup_Check(string taskType)
    {
        // A type from a package, or one that matches nothing exactly, cannot be classified at build time.
        Assert.Empty(Collect(Process(Task("Task_2", taskType), ServiceTask("Task_3", taskType))));
    }

    [Fact]
    public void Every_Mismatch_Is_Reported()
    {
        var diagnostics = Collect(
            Process(Task("Task_2", "pdf"), ServiceTask("Task_3", "signing"), Task("Task_4", "eFormidling"))
        );

        Assert.Equal(["Task_2", "Task_3", "Task_4"], diagnostics.Select(d => d.GetMessage().Split('\'')[1]));
    }

    [Fact]
    public void Diagnostic_Points_At_The_Task_Element()
    {
        var process = Process(Task("Task_2", "pdf"));

        var location = Assert.Single(Collect(process)).Location;

        Assert.Equal(ProcessPath, location.GetLineSpan().Path);
        Assert.Equal("<bpmn:task", process.Substring(location.SourceSpan.Start, location.SourceSpan.Length));
    }

    [Fact]
    public void A_Task_Without_An_Id_Is_Ignored()
    {
        var process = Process(Task("Task_2", "pdf")).Replace("<bpmn:task id=\"Task_2\"", "<bpmn:task");

        Assert.Empty(Collect(process));
    }

    [Fact]
    public void A_Task_Type_Outside_A_Task_Is_Ignored()
    {
        var process = Process(
            """
                <bpmn:extensionElements>
                  <altinn:taskExtension>
                    <altinn:taskType>pdf</altinn:taskType>
                  </altinn:taskExtension>
                </bpmn:extensionElements>

            """
        );

        Assert.Empty(Collect(process));
    }

    [Theory]
    [InlineData("<bpmn:definitions")]
    [InlineData("")]
    [InlineData("<root />")]
    public void Malformed_Process_Is_Ignored(string process)
    {
        Assert.Empty(Collect(process));
    }

    [Fact]
    public void Tasks_In_Another_Namespace_Are_Ignored()
    {
        // The runtime binds only the BPMN namespace, so this is not a task to it.
        var process = Process(
            """
                <other:task xmlns:other="urn:other" id="Task_2">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>pdf</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </other:task>

            """
        );

        Assert.Empty(Collect(process));
    }

    [Fact]
    public void Two_Process_Files_Are_Ignored()
    {
        var process = Process(Task("Task_2", "pdf"));
        var files = ImmutableArray.Create<AdditionalText>(
            new InMemoryAdditionalText(ProcessPath, process),
            new InMemoryAdditionalText("/other/App/config/process/process.bpmn", process)
        );
        var diagnostics = new List<Diagnostic>();

        ProcessTaskElementUtils.CollectDiagnostics(files, [], [], CancellationToken.None, diagnostics);

        Assert.Empty(diagnostics);
    }

    private static List<Diagnostic> Collect(
        string process,
        string[]? appServiceTaskTypes = null,
        string[]? appProcessTaskTypes = null
    )
    {
        var diagnostics = new List<Diagnostic>();
        ProcessTaskElementUtils.CollectDiagnostics(
            [new InMemoryAdditionalText(ProcessPath, process)],
            appServiceTaskTypes ?? [],
            appProcessTaskTypes ?? [],
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }

    private static string Task(string id, string taskType) => Element("task", id, taskType);

    private static string ServiceTask(string id, string taskType) => Element("serviceTask", id, taskType);

    private static string Element(string element, string id, string taskType) =>
        $"""
                <bpmn:{element} id="{id}" name="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>{taskType}</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:{element}>

            """;

    private static string Process(params string[] tasks) =>
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
            {string.Concat(tasks)}    <bpmn:endEvent id="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """;
}
