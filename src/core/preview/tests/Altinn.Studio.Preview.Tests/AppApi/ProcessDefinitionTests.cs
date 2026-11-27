using System.Xml.Linq;
using Altinn.Studio.Preview.AppApi;

namespace Altinn.Studio.Preview.Tests.AppApi;

public sealed class ProcessDefinitionTests
{
    /// <summary>A data task, then a PDF service task, as Studio's template has them.</summary>
    internal const string DataThenPdf = """
        <?xml version="1.0" encoding="utf-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
          <bpmn:process id="Process_1">
            <bpmn:startEvent id="StartEvent_1" />
            <bpmn:task id="Task_1" name="Utfylling">
              <bpmn:extensionElements>
                <altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension>
              </bpmn:extensionElements>
            </bpmn:task>
            <bpmn:serviceTask id="PdfTask" name="Lag PDF">
              <bpmn:extensionElements>
                <altinn:taskExtension><altinn:taskType>pdf</altinn:taskType></altinn:taskExtension>
              </bpmn:extensionElements>
            </bpmn:serviceTask>
            <bpmn:endEvent id="EndEvent_1" />
            <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="PdfTask" />
            <bpmn:sequenceFlow id="Flow_3" sourceRef="PdfTask" targetRef="EndEvent_1" />
          </bpmn:process>
        </bpmn:definitions>
        """;

    /// <summary>A data task whose gateway sends the process back to it.</summary>
    internal const string ReturnsToTheTask = """
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
          <bpmn:process id="Process_1">
            <bpmn:startEvent id="Start" />
            <bpmn:task id="Task_1" altinn:tasktype="data" />
            <bpmn:exclusiveGateway id="Gateway" default="Back" />
            <bpmn:sequenceFlow id="ToTask" sourceRef="Start" targetRef="Task_1" />
            <bpmn:sequenceFlow id="ToGateway" sourceRef="Task_1" targetRef="Gateway" />
            <bpmn:sequenceFlow id="Back" sourceRef="Gateway" targetRef="Task_1" />
          </bpmn:process>
        </bpmn:definitions>
        """;

    /// <summary>
    /// A data task with actions: one the process moves with, and two of the app's own, though the app library reads
    /// the type only from the attribute without the namespace prefix.
    /// </summary>
    internal const string WithActions = """
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
          <bpmn:process id="Process_1">
            <bpmn:startEvent id="StartEvent_1" />
            <bpmn:task id="Task_1">
              <bpmn:extensionElements>
                <altinn:taskExtension>
                  <altinn:taskType>data</altinn:taskType>
                  <altinn:actions>
                    <altinn:action>reject</altinn:action>
                    <altinn:action type="serverAction">fill</altinn:action>
                    <altinn:action altinn:type="serverAction">lookup</altinn:action>
                  </altinn:actions>
                </altinn:taskExtension>
              </bpmn:extensionElements>
            </bpmn:task>
            <bpmn:endEvent id="EndEvent_1" />
            <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
          </bpmn:process>
        </bpmn:definitions>
        """;

    [Fact]
    public void Tasks_HaveTheirTypes_InTheOrderTheDefinitionListsThem()
    {
        ProcessDefinition process = Parse(DataThenPdf);

        Assert.Equal(
            [
                new ProcessTaskDefinition("Task_1", "Utfylling", "data", "Task"),
                new ProcessTaskDefinition("PdfTask", "Lag PDF", "pdf", "ServiceTask"),
            ],
            process.Tasks
        );
    }

    [Fact]
    public void FirstAndNext_FollowTheFlows_ToTheEndEvent()
    {
        ProcessDefinition process = Parse(DataThenPdf);

        Assert.Equal("Task_1", process.First()?.Task?.ElementId);
        Assert.Equal("PdfTask", process.Next("Task_1")?.Task?.ElementId);
        Assert.Equal(new ProcessStep(null, "EndEvent_1"), process.Next("PdfTask"));
    }

    [Fact]
    public void Next_TakesAGatewaysDefaultFlow()
    {
        ProcessDefinition process = Parse(
            """
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
              <bpmn:process id="Process_1">
                <bpmn:startEvent id="Start" />
                <bpmn:exclusiveGateway id="Gateway" default="ToSecond" />
                <bpmn:task id="First" altinn:tasktype="data" />
                <bpmn:task id="Second" altinn:tasktype="confirmation" />
                <bpmn:sequenceFlow id="ToGateway" sourceRef="Start" targetRef="Gateway" />
                <bpmn:sequenceFlow id="ToFirst" sourceRef="Gateway" targetRef="First" />
                <bpmn:sequenceFlow id="ToSecond" sourceRef="Gateway" targetRef="Second" />
              </bpmn:process>
            </bpmn:definitions>
            """
        );

        Assert.Equal(new ProcessTaskDefinition("Second", "Second", "confirmation", "Task"), process.First()?.Task);
    }

    [Fact]
    public void Next_StopsAtALoop()
    {
        ProcessDefinition process = Parse(
            """
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
              <bpmn:process id="Process_1">
                <bpmn:startEvent id="Start" />
                <bpmn:exclusiveGateway id="A" />
                <bpmn:exclusiveGateway id="B" />
                <bpmn:sequenceFlow id="ToA" sourceRef="Start" targetRef="A" />
                <bpmn:sequenceFlow id="ToB" sourceRef="A" targetRef="B" />
                <bpmn:sequenceFlow id="BackToA" sourceRef="B" targetRef="A" />
              </bpmn:process>
            </bpmn:definitions>
            """
        );

        Assert.Null(process.First());
    }

    [Fact]
    public void Next_ReturnsATaskTheFlowsLeadBackTo()
    {
        ProcessDefinition process = Parse(ReturnsToTheTask);

        Assert.Equal("Task_1", process.Next("Task_1")?.Task?.ElementId);
    }

    [Fact]
    public void Actions_AreRead_AsTheAppLibraryReadsThem()
    {
        ProcessDefinition process = Parse(WithActions);

        Assert.Equal(
            [
                new TaskAction("reject", TaskActionType.ProcessAction),
                new TaskAction("fill", TaskActionType.ServerAction),
                new TaskAction("lookup", TaskActionType.ProcessAction),
            ],
            process.Actions("Task_1")
        );
        Assert.Empty(process.Actions("TaskTheProcessLacks"));
    }

    internal static ProcessDefinition Parse(string bpmn) =>
        ProcessDefinition.From(XDocument.Parse(bpmn.Trim())) ?? throw new InvalidOperationException("No process.");
}
