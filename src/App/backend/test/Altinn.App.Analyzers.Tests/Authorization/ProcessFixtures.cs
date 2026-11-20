using System.Text;

namespace Altinn.App.Analyzers.Tests.Authorization;

/// <summary>A BPMN task to render into a process fixture.</summary>
/// <param name="Id">The BPMN element id.</param>
/// <param name="TaskType">The <c>altinn:taskType</c> value.</param>
internal sealed record ProcessTask(string Id, string TaskType);

/// <summary>Builds process.bpmn documents in the shape the Studio process editor produces.</summary>
internal static class ProcessFixtures
{
    internal const string EndEventId = "EndEvent_1";

    internal static string Process(params ProcessTask[] tasks)
    {
        var body = new StringBuilder();
        foreach (var task in tasks)
        {
            body.Append(
                $"""
                    <bpmn:task id="{task.Id}" name="{task.Id}">
                      <bpmn:extensionElements>
                        <altinn:taskExtension>
                          <altinn:taskType>{task.TaskType}</altinn:taskType>
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
