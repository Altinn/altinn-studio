namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Composable builders for process.bpmn fixtures matching the structure Altinn Studio generates.
/// </summary>
internal static class BpmnBuilder
{
    public static string Process(params string[] elements) =>
        """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:altinn="http://altinn.no/process" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
              <bpmn:process id="Process_1" isExecutable="false">
            """
        + "\n"
        + string.Join("\n", elements)
        + "\n"
        + """
              </bpmn:process>
            </bpmn:definitions>
            """;

    /// <param name="id">The BPMN element id.</param>
    /// <param name="taskType">The <c>altinn:taskType</c> value.</param>
    /// <param name="actions">Process actions the task declares (the default <c>processAction</c> type).</param>
    /// <param name="serverActions">Actions the task declares as <c>type="serverAction"</c>.</param>
    public static string Task(string id, string taskType, string[]? actions = null, string[]? serverActions = null)
    {
        var declared = string.Concat(
            (actions ?? [])
                .Select(a => $"<altinn:action>{a}</altinn:action>")
                .Concat(
                    (serverActions ?? []).Select(a => $"""<altinn:action type="serverAction">{a}</altinn:action>""")
                )
        );
        var actionsXml = declared.Length == 0 ? "" : $"\n          <altinn:actions>{declared}</altinn:actions>";

        return $"""
                <bpmn:task id="{id}" name="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>{taskType}</altinn:taskType>{actionsXml}
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
            """;
    }

    public static string ServiceTask(string id, string taskType) =>
        $"""
                <bpmn:serviceTask id="{id}" name="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>{taskType}</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:serviceTask>
            """;

    /// <summary>A pdf service task as the migrator emits it (serviceTask carrying taskType `pdf`).</summary>
    public static string PdfServiceTask(string id) =>
        $"""
                <bpmn:serviceTask id="{id}" name="Generate PDF">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>pdf</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:serviceTask>
            """;

    public static string StartEvent(string id) => $"    <bpmn:startEvent id=\"{id}\" />";

    public static string EndEvent(string id) => $"    <bpmn:endEvent id=\"{id}\" />";

    public static string Gateway(string id) => $"    <bpmn:exclusiveGateway id=\"{id}\" />";

    public static string Flow(string id, string sourceRef, string targetRef) =>
        $"    <bpmn:sequenceFlow id=\"{id}\" sourceRef=\"{sourceRef}\" targetRef=\"{targetRef}\" />";

    public static string ConditionalFlow(string id, string sourceRef, string targetRef, string expression) =>
        $"""
                <bpmn:sequenceFlow id="{id}" sourceRef="{sourceRef}" targetRef="{targetRef}">
                  <bpmn:conditionExpression>{expression}</bpmn:conditionExpression>
                </bpmn:sequenceFlow>
            """;

    public static string Metadata(params string[] dataTypes) =>
        """
            {
              "id": "ttd/myapp",
              "org": "ttd",
              "dataTypes": [
            """
        + "\n"
        + string.Join(",\n", dataTypes)
        + "\n"
        + """
              ]
            }
            """;

    public static string FormDataType(string id, string taskId, bool enablePdfCreation) =>
        $$"""
                {
                  "id": "{{id}}",
                  "taskId": "{{taskId}}",
                  "enablePdfCreation": {{(enablePdfCreation ? "true" : "false")}},
                  "appLogic": {
                    "classRef": "Altinn.App.Models.{{id}}"
                  }
                }
            """;

    public static string AttachmentDataType(string id, bool enablePdfCreation) =>
        $$"""
                {
                  "id": "{{id}}",
                  "enablePdfCreation": {{(enablePdfCreation ? "true" : "false")}},
                  "maxCount": 1
                }
            """;
}
