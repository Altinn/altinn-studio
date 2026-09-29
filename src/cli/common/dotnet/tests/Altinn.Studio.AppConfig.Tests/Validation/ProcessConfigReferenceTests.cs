using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class ProcessConfigReferenceTests
{
    private const string Process = """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="defs">
          <bpmn:process id="proc" isExecutable="false">
            <bpmn:task id="Task_1">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
            <bpmn:task id="Task_pdf">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>pdf</altinn:taskType>
                <altinn:pdfConfig>
                  <altinn:filenameTextResourceKey>pdf.filename</altinn:filenameTextResourceKey>
                  <altinn:autoPdfTaskIds><altinn:taskId>Task_1</altinn:taskId><altinn:taskId>Task_missing</altinn:taskId></altinn:autoPdfTaskIds>
                </altinn:pdfConfig>
              </altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
            <bpmn:task id="Task_ef">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>eFormidling</altinn:taskType>
                <altinn:eFormidlingConfig>
                  <altinn:dataTypes><altinn:dataType>model</altinn:dataType><altinn:dataType>missing-shipment</altinn:dataType></altinn:dataTypes>
                </altinn:eFormidlingConfig>
              </altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
            <bpmn:task id="Task_sub">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>subformPdf</altinn:taskType>
                <altinn:subformPdfConfig><altinn:subformDataTypeId>missing-subform</altinn:subformDataTypeId></altinn:subformPdfConfig>
              </altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
          </bpmn:process>
        </bpmn:definitions>
        """;

    private static InMemoryAppDirectory App() =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = """
                {"id":"ttd/proc","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"}]}
                """,
                ["App/config/process/process.bpmn"] = Process,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[]}}""",
            }
        );

    [Fact]
    public void EFormidlingAndSubformPdfDataTypes_AreResolved()
    {
        var findings = AppConfigEngine
            .Open(App())
            .Validate()
            .Findings.Where(f => f.RuleId == "REF-DATATYPE-ID")
            .ToList();

        Assert.Contains(findings, f => f.Message.Contains("missing-shipment"));
        Assert.Contains(findings, f => f.Message.Contains("missing-subform"));
        Assert.DoesNotContain(findings, f => f.Message.Contains("\"model\""));
        var shipment = findings.Single(f => f.Message.Contains("missing-shipment"));
        Assert.Equal("/process/task[2]/dataTypes/1", shipment.Position.Pointer);
    }

    [Fact]
    public void AutoPdfTaskIds_AreResolved()
    {
        var findings = AppConfigEngine.Open(App()).Validate().Findings.Where(f => f.RuleId == "REF-TASK-ID").ToList();

        var missing = Assert.Single(findings);
        Assert.Contains("Task_missing", missing.Message);
        Assert.Equal("/process/task[1]/autoPdfTaskIds/1", missing.Position.Pointer);
    }

    [Fact]
    public void FilenameTextResourceKey_IsResolved()
    {
        var findings = AppConfigEngine
            .Open(App())
            .Validate()
            .Findings.Where(f => f.RuleId == "REF-TEXT-RESOURCE-KEY")
            .ToList();

        var filename = Assert.Single(findings);
        Assert.Contains("pdf.filename", filename.Message);
        Assert.Contains("Task_pdf", filename.Message);
    }
}
