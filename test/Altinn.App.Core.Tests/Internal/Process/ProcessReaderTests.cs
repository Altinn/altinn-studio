using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessReaderTests
{
    [Fact]
    public void TestBpmnRead()
    {
        ProcessReader pr = ProcessTestUtils.SetupProcessReader("simple-gateway.bpmn");
        pr.GetStartEventIds().Should().Equal("StartEvent");
        pr.GetProcessTaskIds().Should().Equal("Task1", "Task2");
        pr.GetEndEventIds().Should().Equal("EndEvent");
        pr.GetSequenceFlowIds().Should().Equal("Flow1", "Flow2", "Flow3", "Flow4", "Flow5");
        pr.GetExclusiveGatewayIds().Should().Equal("Gateway1");
    }

    [Fact]
    public async Task IsStartEvent_returns_true_when_element_is_StartEvent()
    {
        TelemetrySink telemetrySink = new();
        IProcessReader pr = ProcessTestUtils.SetupProcessReader("simple-gateway.bpmn", null, telemetrySink);
        pr.IsStartEvent("StartEvent").Should().BeTrue();

        await Verify(telemetrySink.GetSnapshot());
    }

    [Fact]
    public void IsStartEvent_returns_false_when_element_is_not_StartEvent()
    {
        IProcessReader pr = ProcessTestUtils.SetupProcessReader("simple-gateway.bpmn");
        pr.IsStartEvent("Task1").Should().BeFalse();
        pr.IsStartEvent("EndEvent").Should().BeFalse();
        pr.IsStartEvent("Gateway1").Should().BeFalse();
        pr.IsStartEvent("Foobar").Should().BeFalse();
        pr.IsStartEvent(null).Should().BeFalse();
    }

    [Fact]
    public void IsProcessTask_returns_true_when_element_is_ProcessTask()
    {
        IProcessReader pr = ProcessTestUtils.SetupProcessReader("simple-gateway.bpmn");
        pr.IsProcessTask("Task1").Should().BeTrue();
    }

    [Fact]
    public void IsProcessTask_returns_false_when_element_is_not_ProcessTask()
    {
        IProcessReader pr = ProcessTestUtils.SetupProcessReader("simple-gateway.bpmn");
        pr.IsProcessTask("StartEvent").Should().BeFalse();
        pr.IsProcessTask("EndEvent").Should().BeFalse();
        pr.IsProcessTask("Gateway1").Should().BeFalse();
        pr.IsProcessTask("Foobar").Should().BeFalse();
        pr.IsProcessTask(null).Should().BeFalse();
    }

    [Fact]
    public void IsEndEvent_returns_true_when_element_is_EndEvent()
    {
        IProcessReader pr = ProcessTestUtils.SetupProcessReader("simple-gateway.bpmn");
        pr.IsEndEvent("EndEvent").Should().BeTrue();
    }

    [Fact]
    public void IsEndEvent_returns_false_when_element_is_not_EndEvent()
    {
        IProcessReader pr = ProcessTestUtils.SetupProcessReader("simple-gateway.bpmn");
        pr.IsEndEvent("StartEvent").Should().BeFalse();
        pr.IsEndEvent("Task1").Should().BeFalse();
        pr.IsEndEvent("Gateway1").Should().BeFalse();
        pr.IsEndEvent("Foobar").Should().BeFalse();
        pr.IsEndEvent(null).Should().BeFalse();
    }

    [Fact]
    public void GetNextElement_returns_gateway()
    {
        var currentElement = "Task1";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader("simple-gateway.bpmn");
        List<ProcessElement> nextElements = pr.GetNextElements(currentElement);
        nextElements
            .Should()
            .BeEquivalentTo(
                new List<ProcessElement>()
                {
                    new ExclusiveGateway()
                    {
                        Id = "Gateway1",
                        Incoming = new List<string>() { "Flow2" },
                        Outgoing = new List<string>() { "Flow3", "Flow4" },
                    },
                }
            );
    }

    [Fact]
    public void GetNextElement_returns_task()
    {
        var bpmnfile = "simple-linear.bpmn";
        var currentElement = "Task1";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<ProcessElement> nextElements = pr.GetNextElements(currentElement);
        nextElements
            .Should()
            .BeEquivalentTo(
                new List<ProcessElement>
                {
                    new ProcessTask()
                    {
                        Id = "Task2",
                        Incoming = new List<string> { "Flow2" },
                        Outgoing = new List<string> { "Flow3" },
                        Name = "Bekreft skjemadata",
                    },
                }
            );
    }

    [Fact]
    public void GetNextElement_returns_all_targets_after_gateway()
    {
        var bpmnfile = "simple-gateway.bpmn";
        var currentElement = "Gateway1";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<ProcessElement> nextElements = pr.GetNextElements(currentElement);
        nextElements
            .Should()
            .BeEquivalentTo(
                new List<ProcessElement>
                {
                    new ProcessTask()
                    {
                        Id = "Task2",
                        Incoming = new List<string>() { "Flow3" },
                        Outgoing = new List<string>() { "Flow5" },
                    },
                    new EndEvent()
                    {
                        Id = "EndEvent",
                        Incoming = new List<string>() { "Flow4", "Flow5" },
                        Outgoing = new List<string>(),
                    },
                }
            );
    }

    [Fact]
    public void GetNextElement_returns_task1_in_simple_process()
    {
        var bpmnfile = "simple-linear.bpmn";
        var currentElement = "StartEvent";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<ProcessElement> nextElements = pr.GetNextElements(currentElement);
        nextElements
            .Should()
            .BeEquivalentTo(
                new List<ProcessElement>()
                {
                    new ProcessTask()
                    {
                        Id = "Task1",
                        Name = "Utfylling",
                        Incoming = new List<string>() { "Flow1" },
                        Outgoing = new List<string>() { "Flow2" },
                    },
                }
            );
    }

    [Fact]
    public void GetNextElement_returns_task2_in_simple_process()
    {
        var bpmnfile = "simple-linear.bpmn";
        var currentElement = "Task1";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<ProcessElement> nextElements = pr.GetNextElements(currentElement);
        nextElements
            .Should()
            .BeEquivalentTo(
                new List<ProcessElement>()
                {
                    new ProcessTask()
                    {
                        Id = "Task2",
                        Name = "Bekreft skjemadata",
                        Incoming = new List<string>() { "Flow2" },
                        Outgoing = new List<string>() { "Flow3" },
                    },
                }
            );
    }

    [Fact]
    public void GetNextElement_returns_endevent_in_simple_process()
    {
        var bpmnfile = "simple-linear.bpmn";
        var currentElement = "Task2";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<ProcessElement> nextElements = pr.GetNextElements(currentElement);
        nextElements
            .Should()
            .BeEquivalentTo(
                new List<ProcessElement>()
                {
                    new EndEvent()
                    {
                        Id = "EndEvent",
                        Incoming = new List<string>() { "Flow3" },
                        Outgoing = new List<string>(),
                    },
                }
            );
    }

    [Fact]
    public void GetNextElement_returns_emptylist_if_task_without_output()
    {
        var bpmnfile = "simple-no-end.bpmn";
        var currentElement = "Task2";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<ProcessElement> nextElements = pr.GetNextElements(currentElement);
        nextElements.Should().HaveCount(0);
    }

    [Fact]
    public void GetNextElement_currentElement_null()
    {
        var bpmnfile = "simple-linear.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        pr.Invoking(p => p.GetNextElements(null!)).Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void GetNextElement_throws_exception_if_step_not_found()
    {
        var bpmnfile = "simple-linear.bpmn";
        var currentElement = "NoStep";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        pr.Invoking(p => p.GetNextElements(currentElement)).Should().Throw<ProcessException>();
    }

    [Fact]
    public void GetOutgoingSequenceFlows_returns_empty_list_if_input_is_null()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        pr.GetOutgoingSequenceFlows(null).Should().BeEmpty();
    }

    [Fact]
    public void GetOutgoingSequenceFlows_returns_SequenceFlow_objects_for_outgoing_flows_from_ProcessTask()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<SequenceFlow> outgoingFLows = pr.GetOutgoingSequenceFlows(pr.GetFlowElement("Task1"));
        outgoingFLows
            .Should()
            .BeEquivalentTo(
                new List<SequenceFlow>
                {
                    new SequenceFlow()
                    {
                        Id = "Flow2",
                        FlowType = null!,
                        SourceRef = "Task1",
                        TargetRef = "Gateway1",
                    },
                }
            );
    }

    [Fact]
    public void GetOutgoingSequenceFlows_returns_SequenceFlow_objects_for_outgoing_flows_from_Gateway()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<SequenceFlow> outgoingFLows = pr.GetOutgoingSequenceFlows(pr.GetFlowElement("Gateway1"));
        outgoingFLows
            .Should()
            .BeEquivalentTo(
                new List<SequenceFlow>
                {
                    new SequenceFlow()
                    {
                        Id = "Flow3",
                        FlowType = null!,
                        SourceRef = "Gateway1",
                        TargetRef = "Task2",
                    },
                    new SequenceFlow()
                    {
                        Id = "Flow4",
                        FlowType = null!,
                        SourceRef = "Gateway1",
                        TargetRef = "EndEvent",
                    },
                }
            );
    }

    [Fact]
    public void GetOutgoingSequenceFlows_returns_empty_list_when_no_outgoing()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        List<SequenceFlow> outgoingFLows = pr.GetOutgoingSequenceFlows(pr.GetFlowElement("EndEvent"));
        outgoingFLows.Should().BeEmpty();
    }

    [Fact]
    public void Constructor_Fails_if_invalid_bpmn()
    {
        Assert.Throws<InvalidOperationException>(() => ProcessTestUtils.SetupProcessReader("not-bpmn.bpmn"));
    }

    [Fact]
    public void GetFlowElement_returns_StartEvent_with_id()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        pr.GetFlowElement("StartEvent")
            .Should()
            .BeOfType<StartEvent>()
            .And.BeEquivalentTo(
                new StartEvent()
                {
                    Id = "StartEvent",
                    Name = null!,
                    Incoming = new List<string>(),
                    Outgoing = new List<string> { "Flow1" },
                }
            );
    }

    [Fact]
    public void GetFlowElement_returns_ProcessTask_with_id()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        pr.GetFlowElement("Task1")
            .Should()
            .BeOfType<ProcessTask>()
            .And.BeEquivalentTo(
                new ProcessTask()
                {
                    Id = "Task1",
                    Name = null!,
                    Incoming = new List<string> { "Flow1" },
                    Outgoing = new List<string> { "Flow2" },
                    ExtensionElements = new ExtensionElements()
                    {
                        TaskExtension = new AltinnTaskExtension()
                        {
                            AltinnActions = new List<AltinnAction>()
                            {
                                new("submit", ActionType.ProcessAction),
                                new("lookup", ActionType.ServerAction),
                            },
                            TaskType = "data",
                            SignatureConfiguration = new()
                            {
                                DataTypesToSign = new() { "default", "default2" },
                                SignatureDataType = "signature",
                                UniqueFromSignaturesInDataTypes = new() { "signature1" },
                            },
                        },
                    },
                }
            );
    }

    [Fact]
    public void GetFlowElement_returns_EndEvent_with_id()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        pr.GetFlowElement("EndEvent")
            .Should()
            .BeOfType<EndEvent>()
            .And.BeEquivalentTo(
                new EndEvent()
                {
                    Id = "EndEvent",
                    Name = null!,
                    Incoming = new List<string> { "Flow4", "Flow5" },
                    Outgoing = new List<string>(),
                }
            );
    }

    [Fact]
    public void GetFlowElement_returns_null_when_id_not_found()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        pr.GetFlowElement("Foobar").Should().BeNull();
    }

    [Fact]
    public void GetFlowElement_returns_Gateway_with_id()
    {
        var bpmnfile = "simple-gateway-default.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);
        pr.GetFlowElement("Gateway1")
            .Should()
            .BeOfType<ExclusiveGateway>()
            .And.BeEquivalentTo(
                new ExclusiveGateway()
                {
                    Id = "Gateway1",
                    Name = null!,
                    Default = "Flow3",
                    Incoming = new List<string> { "Flow2" },
                    Outgoing = new List<string> { "Flow3", "Flow4" },
                }
            );
    }

    [Fact]
    public void SignatureConfiguration_WorksAsExpected()
    {
        var bpmnfile = "simple-gateway-signature-config.bpmn";
        ProcessReader pr = ProcessTestUtils.SetupProcessReader(bpmnfile);

        var task1 = (ProcessTask)pr.GetFlowElement("Task1")!;
        task1
            .ExtensionElements!.TaskExtension!.SignatureConfiguration.Should()
            .BeEquivalentTo(
                new AltinnSignatureConfiguration
                {
                    DataTypesToSign = ["signatureDataType1", "signatureDataType2"],
                    SignatureDataType = "signature",
                    UniqueFromSignaturesInDataTypes = ["signature1"],
                    SigneeProviderId = "signeeProviderId",
                    SigneeStatesDataTypeId = "signeeStatesDataTypeId",
                    CorrespondenceResources =
                    [
                        new AltinnEnvironmentConfig { Environment = null, Value = "correspondenceResource" },
                        new AltinnEnvironmentConfig { Environment = "tt02", Value = "correspondenceResourceTt02" },
                        new AltinnEnvironmentConfig { Environment = "prod", Value = "correspondenceResourceProd" },
                    ],
                }
            );
    }
}
