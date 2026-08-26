using System.Text;

namespace Altinn.App.Analyzers.Tests.Authorization;

/// <summary>A BPMN task to render into a process fixture.</summary>
/// <param name="Id">The BPMN element id.</param>
/// <param name="TaskType">The <c>altinn:taskType</c> value.</param>
/// <param name="Actions">Process actions the task declares (the default <c>processAction</c> type).</param>
/// <param name="ServerActions">Actions the task declares as <c>type="serverAction"</c>.</param>
internal sealed record ProcessTask(
    string Id,
    string TaskType,
    string[]? Actions = null,
    string[]? ServerActions = null
);

/// <summary>Builds process.bpmn documents in the shape the Studio process editor produces.</summary>
internal static class ProcessFixtures
{
    internal const string EndEventId = "EndEvent_1";

    internal static string Process(params ProcessTask[] tasks)
    {
        var body = new StringBuilder();
        foreach (var task in tasks)
        {
            var actions = new StringBuilder();
            foreach (var action in task.Actions ?? [])
            {
                actions.Append($"<altinn:action>{action}</altinn:action>");
            }

            foreach (var action in task.ServerActions ?? [])
            {
                actions.Append($"""<altinn:action type="serverAction">{action}</altinn:action>""");
            }

            var actionsXml = actions.Length == 0 ? "" : $"<altinn:actions>{actions}</altinn:actions>";

            body.Append(
                $"""
                    <bpmn:task id="{task.Id}" name="{task.Id}">
                      <bpmn:extensionElements>
                        <altinn:taskExtension>
                          <altinn:taskType>{task.TaskType}</altinn:taskType>
                          {actionsXml}
                        </altinn:taskExtension>
                      </bpmn:extensionElements>
                    </bpmn:task>

                """
            );
        }

        return $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions_1">
              <bpmn:process id="Altinn_Process_Definition" isExecutable="true">
                <bpmn:startEvent id="StartEvent_1" />
            {body}    <bpmn:endEvent id="{EndEventId}" />
              </bpmn:process>
            </bpmn:definitions>
            """;
    }
}
