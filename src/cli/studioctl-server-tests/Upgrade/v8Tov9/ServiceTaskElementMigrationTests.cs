using System.Text;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ServiceTaskElementMigrationTests : IDisposable
{
    private const string ProcessPath = "config/process/process.bpmn";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() => ServiceTaskElementMigration.Migrate(_app.Root);

    [Theory]
    [InlineData("pdf")]
    [InlineData("subformPdf")]
    [InlineData("eFormidling")]
    [InlineData("fiksArkiv")]
    public async Task ChangesABuiltInServiceTaskTypeToAServiceTask(string taskType)
    {
        _app.Write(
            ProcessPath,
            Process(
                StartEvent("Start"),
                Task("Task_1", "data"),
                Task("Task_Send", taskType),
                Flow("f1", "Start", "Task_1"),
                Flow("f2", "Task_1", "Task_Send")
            )
        );

        var result = await Migrate();

        Assert.Equal(
            Process(
                StartEvent("Start"),
                Task("Task_1", "data"),
                ServiceTask("Task_Send", taskType),
                Flow("f1", "Start", "Task_1"),
                Flow("f2", "Task_1", "Task_Send")
            ),
            _app.Read(ProcessPath)
        );
        var warning = Assert.Single(result.Warnings);
        Assert.Equal(
            $"Changed task(s) 'Task_Send' ({taskType}) in config/process/process.bpmn from bpmn:task to "
                + "bpmn:serviceTask, the element v9 requires for a built-in service task type.",
            warning
        );
        Assert.False(result.RequiresManualFollowUp);
    }

    [Fact]
    public async Task KeepsTheAttributesChildrenAndDiagram()
    {
        // ELEMENT is the element name: the expected file is the input with only the tag names changed.
        const string template = """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:altinn="http://altinn.no/process" id="Definitions_1">
              <bpmn:process id="Process_1" isExecutable="false">
                <bpmn:task id="Task_1" name="Utfylling">
                  <bpmn:extensionElements>
                    <altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension>
                  </bpmn:extensionElements>
                  <bpmn:outgoing>Flow_2</bpmn:outgoing>
                </bpmn:task>
                <bpmn:ELEMENT   id="Task_Send"
                    name="Send med eFormidling" custom:flag="x" xmlns:custom="urn:custom" >
                  <bpmn:documentation>Sender &lt;bpmn:task&gt; videre</bpmn:documentation>
                  <bpmn:incoming>Flow_2</bpmn:incoming>
                  <bpmn:outgoing>Flow_3</bpmn:outgoing>
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>eFormidling</altinn:taskType>
                      <altinn:eFormidlingConfig>
                        <altinn:receiver>910123456</altinn:receiver>
                      </altinn:eFormidlingConfig>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:ELEMENT  >
                <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_Send" />
              </bpmn:process>
              <bpmndi:BPMNDiagram id="BPMNDiagram_1">
                <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
                  <bpmndi:BPMNShape id="Task_Send_di" bpmnElement="Task_Send">
                    <dc:Bounds x="370" y="77" width="100" height="80" />
                  </bpmndi:BPMNShape>
                </bpmndi:BPMNPlane>
              </bpmndi:BPMNDiagram>
            </bpmn:definitions>
            """;
        _app.Write(ProcessPath, template.Replace("ELEMENT", "task", StringComparison.Ordinal));

        var result = await Migrate();

        Assert.Equal(template.Replace("ELEMENT", "serviceTask", StringComparison.Ordinal), _app.Read(ProcessPath));
        Assert.Contains("'Task_Send' (eFormidling)", Assert.Single(result.Warnings), StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesOtherTasksAlone()
    {
        var process = Process(
            Task("Task_Data", "data"),
            Task("Task_Custom", "myOwnServiceTask"),
            Task("Task_Case", "EFormidling"),
            Task("Task_Padded", " pdf "),
            Task("Task_Signing", "signing"),
            ServiceTask("Task_Pdf", "pdf"),
            ServiceTask("Task_Fiks", "fiksArkiv")
        );
        _app.Write(ProcessPath, process);

        var result = await Migrate();

        Assert.Equal(process, _app.Read(ProcessPath));
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task KeepsEachTasksPrefixAndSkipsOtherNamespaces()
    {
        // ELEMENT is the element name. Two tasks on one line, a default-namespace task and a bpmn2-prefixed one, and
        // a task element in another namespace, which is not BPMN's and stays as it is.
        const string template = """
            <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:other="urn:other" xmlns:altinn="http://altinn.no/process">
              <process id="Process_1">
                <ELEMENT id="A"><extensionElements><altinn:taskExtension><altinn:taskType>pdf</altinn:taskType></altinn:taskExtension></extensionElements></ELEMENT><bpmn2:ELEMENT id="B"><bpmn2:extensionElements><altinn:taskExtension><altinn:taskType>fiksArkiv</altinn:taskType></altinn:taskExtension></bpmn2:extensionElements></bpmn2:ELEMENT>
                <other:task id="C"><extensionElements><altinn:taskExtension><altinn:taskType>pdf</altinn:taskType></altinn:taskExtension></extensionElements></other:task>
              </process>
            </definitions>
            """;
        _app.Write(ProcessPath, template.Replace("ELEMENT", "task", StringComparison.Ordinal));

        var result = await Migrate();

        Assert.Equal(template.Replace("ELEMENT", "serviceTask", StringComparison.Ordinal), _app.Read(ProcessPath));
        Assert.Contains("'A' (pdf), 'B' (fiksArkiv)", Assert.Single(result.Warnings), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PreservesByteOrderMarkLineEndingsAndTabs()
    {
        var process = Process(Task("Task_1", "data"), Task("Task_Send", "eFormidling"))
            .Replace("    ", "\t", StringComparison.Ordinal)
            .Replace("\n", "\r\n", StringComparison.Ordinal);
        _app.WriteBytes(ProcessPath, [0xEF, 0xBB, 0xBF, .. Encoding.UTF8.GetBytes(process)]);

        await Migrate();

        var after = _app.ReadBytes(ProcessPath);
        Assert.Equal([0xEF, 0xBB, 0xBF], after[..3]);
        Assert.Equal(
            Process(Task("Task_1", "data"), ServiceTask("Task_Send", "eFormidling"))
                .Replace("    ", "\t", StringComparison.Ordinal)
                .Replace("\n", "\r\n", StringComparison.Ordinal),
            Encoding.UTF8.GetString(after[3..])
        );
    }

    [Fact]
    public async Task SecondRunFindsNothing()
    {
        _app.Write(ProcessPath, Process(Task("Task_Send", "eFormidling")));
        await Migrate();
        var afterFirstRun = _app.Read(ProcessPath);

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(afterFirstRun, _app.Read(ProcessPath));
    }

    [Fact]
    public async Task LeavesTheFileUnchangedWhenTheEditIsNotSafe()
    {
        // The comment holds a closing tag the text edit would take for the task's own.
        var process = Process(
            Task("Task_Send", "eFormidling")
                .Replace("</bpmn:task>", "<!-- </bpmn:task> -->\n    </bpmn:task>", StringComparison.Ordinal)
        );
        _app.Write(ProcessPath, process);

        var result = await Migrate();

        Assert.Equal(process, _app.Read(ProcessPath));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("'Task_Send' (eFormidling)", todo, StringComparison.Ordinal);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task WithoutAProcess_ReportsNothing()
    {
        var result = await Migrate();

        Assert.Empty(result.Messages);
    }
}
