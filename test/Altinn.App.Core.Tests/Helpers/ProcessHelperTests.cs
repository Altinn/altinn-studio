using System.Collections.Generic;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Helpers;

public class ProcessHelperTests
{
    [Fact]
    public async Task CanEndProcessTask_returns_true_when_task_is_validated_even_with_validationIssues()
    {
        // Arrange
        var instance = new Instance()
        {
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    Validated = new ValidationStatus()
                    {
                        CanCompleteTask = true
                    }
                }
            }
        };
        var validationIssues = new List<ValidationIssue>()
        {
            new ValidationIssue()
            {
                Severity = ValidationIssueSeverity.Error
            }
        };

        // Act and Assert
        var canEnd = await ProcessHelper.CanEndProcessTask(instance, validationIssues);
        canEnd.Should().BeTrue();
    }

    [Fact]
    public async Task CanEndProcessTask_returns_true_when_no_validationIssues()
    {
        // Arrange
        var instance = new Instance();
        var validationIssues = new List<ValidationIssue>();

        // Act and Assert
        var canEnd = await ProcessHelper.CanEndProcessTask(instance, validationIssues);
        canEnd.Should().BeTrue();
    }

    [Fact]
    public async void CanEndProcessTask_returns_false_when_task_is_validated_false_even_with_no_validationIssues()
    {
        // Arrange
        var instance = new Instance()
        {
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    Validated = new ValidationStatus()
                    {
                        CanCompleteTask = false
                    }
                }
            }
        };
        var validationIssues = new List<ValidationIssue>();

        // Act and Assert
        var canEnd = await ProcessHelper.CanEndProcessTask(instance, validationIssues);
        canEnd.Should().BeFalse();
    }

    [Fact]
    public async void CanEndProcessTask_returns_false_when_task_is_not_validated_with_validationIssues()
    {
        // Arrange
        var instance = new Instance();
        var validationIssues = new List<ValidationIssue>()
        {
            new ValidationIssue()
            {
                Severity = ValidationIssueSeverity.Error
            }
        };

        // Act and Assert
        var canEnd = await ProcessHelper.CanEndProcessTask(instance, validationIssues);
        canEnd.Should().BeFalse();
    }

    [Fact]
    public void GetValidStartEventOrError_returns_start_event_and_no_error_when_null_proposed_and_one_StartEvent()
    {
        List<string> possibleStartEvents = new List<string>() { "StartEvent" };
        string? actual = ProcessHelper.GetValidStartEventOrError(null, possibleStartEvents, out ProcessError? processError);
        actual.Should().Be("StartEvent");
        processError.Should().BeNull();
    }

    [Fact]
    public void GetValidStartEventOrError_returns_start_event_and_no_error_when_proposed_in_possibleStartEvents()
    {
        List<string> possibleStartEvents = new List<string>() { "StartEvent", "StartEvent2" };
        string? actual = ProcessHelper.GetValidStartEventOrError("StartEvent", possibleStartEvents, out ProcessError? processError);
        actual.Should().Be("StartEvent");
        processError.Should().BeNull();
    }

    [Fact]
    public void GetValidStartEventOrError_returns_null_and_error_when_proposed_and_single_StartEvent_not_matches()
    {
        List<string> possibleStartEvents = new List<string>() { "StartEvent" };
        string? actual = ProcessHelper.GetValidStartEventOrError("NotPossibleStart", possibleStartEvents, out ProcessError? processError);
        actual.Should().BeNull();
        processError.Should().BeEquivalentTo(
            new ProcessError()
            {
                Code = "Conflict",
                Text = "There is no such start event as 'NotPossibleStart' in the process definition."
            });
    }

    [Fact]
    public void GetValidStartEventOrError_returns_null_and_error_when_proposed_null_and_multiple_possibleStartEvents()
    {
        List<string> possibleStartEvents = new List<string>() { "StartEvent", "StartEvent2" };
        string? actual = ProcessHelper.GetValidStartEventOrError(null, possibleStartEvents, out ProcessError? processError);
        actual.Should().BeNull();
        processError.Should().BeEquivalentTo(
            new ProcessError()
            {
                Code = "Conflict",
                Text = "There are more than one start events available. Chose one: [StartEvent, StartEvent2]"
            });
    }

    [Fact]
    public void GetValidStartEventOrError_returns_null_and_error_when_possibleStartEvents_is_empty()
    {
        List<string> possibleStartEvents = new List<string>();
        string? actual = ProcessHelper.GetValidStartEventOrError(null, possibleStartEvents, out ProcessError? processError);
        actual.Should().BeNull();
        processError.Should().BeEquivalentTo(
            new ProcessError()
            {
                Code = "Conflict",
                Text = "There is no start events in process definition. Cannot start process!"
            });
    }

    [Fact]
    public void GetValidNextElementOrError_returns_next_and_no_error_when_possibleNextElements_hase_one_element()
    {
        List<string> possibleNextElements = new List<string>() { "Task2" };
        string? actual = ProcessHelper.GetValidNextElementOrError(null, possibleNextElements, out ProcessError? processError);
        actual.Should().Be("Task2");
        processError.Should().BeNull();
    }

    [Fact]
    public void GetValidNextElementOrError_returns_next_null_and_error_when_possibleNextElements_hase_two_element()
    {
        List<string> possibleNextElements = new List<string>() { "Task2", "Task3" };
        string? actual = ProcessHelper.GetValidNextElementOrError(null, possibleNextElements, out ProcessError? processError);
        actual.Should().BeNull();
        processError.Should().BeEquivalentTo(
            new ProcessError()
            {
                Code = "Conflict",
                Text = $"There are more than one outgoing sequence flows, please select one 'System.Collections.Generic.List`1[System.String]'"
            });
    }

    [Fact]
    public void GetValidNextElementOrError_returns_proposed_and_no_error_when_possibleNextElements_has_one_element_matching_proposal()
    {
        List<string> possibleNextElements = new List<string>() { "Task2", "Task3" };
        string? actual = ProcessHelper.GetValidNextElementOrError("Task3", possibleNextElements, out ProcessError? processError);
        actual.Should().Be("Task3");
        processError.Should().BeNull();
    }

    [Fact]
    public void GetValidNextElementOrError_returns_null_and_error_when_possibleNextElements_has_no_elements_matching_proposal()
    {
        List<string> possibleNextElements = new List<string>() { "Task2", "Task3" };
        string? actual = ProcessHelper.GetValidNextElementOrError("Foobar", possibleNextElements, out ProcessError? processError);
        actual.Should().BeNull();
        processError.Should().BeEquivalentTo(
            new ProcessError()
            {
                Code = "Conflict",
                Text = "The proposed next element id 'Foobar' is not among the available next process elements"
            });
    }

    [Fact]
    public void GetValidNextElementOrError_returns_next_null_and_error_when_possibleNextElements_hase_no_element()
    {
        List<string> possibleNextElements = new List<string>();
        string? actual = ProcessHelper.GetValidNextElementOrError(null, possibleNextElements, out ProcessError? processError);
        actual.Should().BeNull();
        processError.Should().BeEquivalentTo(
            new ProcessError()
            {
                Code = "Conflict",
                Text = "There are no outgoing sequence flows from current element. Cannot find next process element. Error in bpmn file!"
            });
    }

    [Fact]
    public void GetSequenceFlowType_returns_flowtype_of_first_SequenceFlow()
    {
        List<SequenceFlow> sequenceFlows = new List<SequenceFlow>()
        {
            new SequenceFlow()
            {
                Id = "Flow1",
                FlowType = "AbandonCurrentReturnToNext",
                SourceRef = "Task1",
                TargetRef = "Task2",
            },
            new SequenceFlow()
            {
                Id = "Flow2",
                FlowType = "CompleteCurrentMoveToNext",
                SourceRef = "Task2",
                TargetRef = "Task3",
            }
        };
        ProcessHelper.GetSequenceFlowType(sequenceFlows).Should().Be(ProcessSequenceFlowType.AbandonCurrentReturnToNext);
    }

    [Fact]
    public void GetSequenceFlowType_returns_second_flow_type_if_FlowType_Not_Defined_on_first_flow()
    {
        List<SequenceFlow> sequenceFlows = new List<SequenceFlow>()
        {
            new SequenceFlow()
            {
                Id = "Flow1",
                SourceRef = "Task1",
                TargetRef = "Task2",
            },
            new SequenceFlow()
            {
                Id = "Flow2",
                FlowType = "AbandonCurrentReturnToNext",
                SourceRef = "Task2",
                TargetRef = "Task3",
            }
        };
        ProcessHelper.GetSequenceFlowType(sequenceFlows).Should().Be(ProcessSequenceFlowType.AbandonCurrentReturnToNext);
    }

    [Fact]
    public void GetSequenceFlowType_returns_CompleteCurrentMoveToNext_if_FlowType_Not_Defined()
    {
        List<SequenceFlow> sequenceFlows = new List<SequenceFlow>()
        {
            new SequenceFlow()
            {
                Id = "Flow1",
                SourceRef = "Task1",
                TargetRef = "Task2",
            },
            new SequenceFlow()
            {
                Id = "Flow2",
                SourceRef = "Task2",
                TargetRef = "Task3",
            }
        };
        ProcessHelper.GetSequenceFlowType(sequenceFlows).Should().Be(ProcessSequenceFlowType.CompleteCurrentMoveToNext);
    }

    [Fact]
    public void GetSequenceFlowType_returns_CompleteCurrentMoveToNext_if_Unknown_FlowTypes()
    {
        List<SequenceFlow> sequenceFlows = new List<SequenceFlow>()
        {
            new SequenceFlow()
            {
                Id = "Flow1",
                SourceRef = "Task1",
                TargetRef = "Task2",
                FlowType = "FooFlowType"
            },
            new SequenceFlow()
            {
                Id = "Flow2",
                SourceRef = "Task2",
                TargetRef = "Task3",
                FlowType = "BarFlowType"
            }
        };
        ProcessHelper.GetSequenceFlowType(sequenceFlows).Should().Be(ProcessSequenceFlowType.CompleteCurrentMoveToNext);
    }
}
