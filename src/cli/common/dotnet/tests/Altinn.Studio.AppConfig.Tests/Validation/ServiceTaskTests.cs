using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class ServiceTaskTests
{
    private const string Bpmn = "App/config/process/process.bpmn";

    private const string Process = """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
          <bpmn:process id="proc">
            <bpmn:startEvent id="Start" />
            <bpmn:task id="Task_1">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
            <bpmn:serviceTask id="PdfForm">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>pdf</altinn:taskType>
                <altinn:pdfConfig>
                  <altinn:filenameTextResourceKey>pdf.filename</altinn:filenameTextResourceKey>
                  <altinn:autoPdfTaskIds><altinn:taskId>Task_1</altinn:taskId><altinn:taskId>Task_missing</altinn:taskId></altinn:autoPdfTaskIds>
                </altinn:pdfConfig>
              </altinn:taskExtension></bpmn:extensionElements>
            </bpmn:serviceTask>
            <bpmn:serviceTask id="Shipment">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>eFormidling</altinn:taskType>
                <altinn:eFormidlingConfig>
                  <altinn:dataTypes><altinn:dataType>model</altinn:dataType><altinn:dataType>missing-shipment</altinn:dataType></altinn:dataTypes>
                </altinn:eFormidlingConfig>
              </altinn:taskExtension></bpmn:extensionElements>
            </bpmn:serviceTask>
            <bpmn:serviceTask id="Untyped" />
            <bpmn:endEvent id="End" />
            <bpmn:sequenceFlow id="f1" sourceRef="Start" targetRef="Task_1" />
            <bpmn:sequenceFlow id="f2" sourceRef="Task_1" targetRef="PdfForm" />
            <bpmn:sequenceFlow id="f3" sourceRef="PdfForm" targetRef="Shipment" />
            <bpmn:sequenceFlow id="f4" sourceRef="Shipment" targetRef="Untyped" />
            <bpmn:sequenceFlow id="f5" sourceRef="Untyped" targetRef="End" />
          </bpmn:process>
        </bpmn:definitions>
        """;

    private const string Layout =
        """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"P1","taskId":"PdfForm"}}]}}""";

    private static InMemoryAppDirectory App()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = """
                {"id":"ttd/svc","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[
                  {"id":"model","taskId":"Task_1","appLogic":{"classRef":"M"}},
                  {"id":"receipt","taskId":"PdfForm"}
                ]}
                """,
                [Bpmn] = Process,
            }
        );
        foreach (var folder in new[] { "Task_1", "PdfForm" })
        {
            dir.Set($"App/ui/{folder}/Settings.json", """{"pages":{"order":["P1"]},"defaultDataType":"model"}""");
            dir.Set($"App/ui/{folder}/layouts/P1.json", folder == "Task_1" ? Layout : """{"data":{"layout":[]}}""");
        }
        return dir;
    }

    private static IReadOnlyList<Finding> Findings(string rule) =>
        AppConfigEngine.Open(App()).Validate().Findings.Where(f => f.RuleId == rule).ToList();

    [Fact]
    public void FolderNamedAfterAServiceTask_IsNotUnused()
    {
        Assert.Empty(Findings("UNUSED-LAYOUT-FOLDER"));
    }

    [Fact]
    public void ServiceTasks_AreNotHeldToDataTaskRequirements()
    {
        Assert.Empty(Findings("CROSS-TASK-HAS-LAYOUT-FOLDER"));
        Assert.Empty(Findings("CROSS-TASK-HAS-DATATYPE"));
    }

    [Fact]
    public void TaskIdsPointingAtAServiceTask_Resolve()
    {
        var missing = Assert.Single(Findings("REF-TASK-ID"));

        Assert.Contains("Task_missing", missing.Message, StringComparison.Ordinal);
        Assert.Equal("/process/serviceTask[0]/autoPdfTaskIds/1", missing.Position.Pointer);
    }

    [Fact]
    public void ServiceTaskConfig_IsResolved()
    {
        var dataType = Assert.Single(Findings("REF-DATATYPE-ID"));
        Assert.Contains("missing-shipment", dataType.Message, StringComparison.Ordinal);
        Assert.Equal("/process/serviceTask[1]/dataTypes/1", dataType.Position.Pointer);

        var text = Assert.Single(Findings("REF-TEXT-RESOURCE-KEY"));
        Assert.Contains("pdf.filename", text.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ServiceTask_IsModeled_ButItsMissingTaskTypeIsNoted()
    {
        var gap = Assert.Single(Findings("PARSER-COVERAGE-GAP"));

        Assert.Contains("bpmn.missingTaskType", gap.Message, StringComparison.Ordinal);
        Assert.Contains("\"Untyped\"", gap.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ServiceTaskWithAnUnknownType_IsWarned()
    {
        var dir = App();
        dir.Set(Bpmn, Process.Replace("<altinn:taskType>pdf<", "<altinn:taskType>pfd<", StringComparison.Ordinal));

        var finding = Assert.Single(
            AppConfigEngine.Open(dir).Validate().Findings,
            f => f.RuleId == "PROCESS-TASK-TYPE"
        );
        Assert.Contains("\"pfd\"", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ServiceTask_IsATaskSymbol()
    {
        var engine = AppConfigEngine.Open(App());
        engine.Build();
        var symbols = new AppSymbols(engine);
        const string page = "App/ui/Task_1/layouts/P1.json";
        var col = Layout.IndexOf("\"PdfForm\"", StringComparison.Ordinal) + 2;

        var definition = Assert.Single(symbols.Definition(page, 1, col));
        Assert.Equal(Bpmn, definition.File);
        Assert.Contains(symbols.Completions(page, 1, col), s => s.Label == "PdfForm");
        var lens = Assert.Single(symbols.CodeLenses(Bpmn), l => l.Range.Line == definition.Line);
        Assert.Equal("2 references", lens.Title);
    }
}
