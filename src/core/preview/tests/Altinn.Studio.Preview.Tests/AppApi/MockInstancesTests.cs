using Altinn.Studio.Preview.AppApi;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests.AppApi;

public sealed class MockInstancesTests
{
    private static readonly DateTimeOffset s_now = new(2026, 11, 26, 9, 0, 0, TimeSpan.FromHours(1));

    [Fact]
    public void Create_StopsAtALoopOfServiceTasks()
    {
        var app = new AppDefinition(
            ProcessDefinitionTests.Parse(
                """
                <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
                  <bpmn:process id="Process_1">
                    <bpmn:startEvent id="Start" />
                    <bpmn:serviceTask id="A" altinn:tasktype="pdf" />
                    <bpmn:serviceTask id="B" altinn:tasktype="pdf" />
                    <bpmn:sequenceFlow id="ToA" sourceRef="Start" targetRef="A" />
                    <bpmn:sequenceFlow id="ToB" sourceRef="A" targetRef="B" />
                    <bpmn:sequenceFlow id="BackToA" sourceRef="B" targetRef="A" />
                  </bpmn:process>
                </bpmn:definitions>
                """
            ),
            []
        );

        Instance instance = MockInstances.Create(new MockState(), app, "ttd", "my-app", 51001, s_now);

        Assert.Null(instance.Process.CurrentTask);
        Assert.Null(instance.Process.Ended);
    }

    [Fact]
    public void MoveNext_KeepsTheFormData_OfATaskTheProcessReturnsTo()
    {
        var app = new AppDefinition(
            ProcessDefinitionTests.Parse(ProcessDefinitionTests.ReturnsToTheTask),
            [new DataType("model", "Task_1", "App.Models.Model", AutoCreate: true)]
        );
        var state = new MockState();
        Instance created = MockInstances.Create(state, app, "ttd", "my-app", 51001, s_now);
        (Guid instanceGuid, MockInstance instance) = Assert.Single(state.Instances);
        DataElement formData = Assert.Single(created.Data);

        Assert.True(MockInstances.MoveNext(instance, instanceGuid, app, s_now));

        Assert.Equal("Task_1", instance.Instance.Process.CurrentTask?.ElementId);
        Assert.Equal(formData.Id, Assert.Single(instance.Instance.Data).Id);
    }
}
