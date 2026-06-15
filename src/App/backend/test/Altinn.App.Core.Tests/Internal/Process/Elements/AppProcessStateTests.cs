#nullable disable
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Internal.Process.Elements;

public class AppProcessStateTests
{
    [Fact]
    public void Constructor_with_ProcessState_copies_values()
    {
        ProcessState input = new ProcessState()
        {
            Started = DateTime.Now,
            StartEvent = "StartEvent",
            Ended = DateTime.Now,
            EndEvent = "EndEvent",
            CurrentTask = new()
            {
                Started = DateTime.Now,
                Ended = DateTime.Now,
                Flow = 2,
                Name = "Utfylling",
                Validated = new() { Timestamp = DateTime.Now, CanCompleteTask = false },
                ElementId = "Task_1",
                FlowType = "FlowType",
                AltinnTaskType = AltinnTaskTypes.Data,
            },
        };
        AppProcessState expected = new AppProcessState()
        {
            Started = input.Started,
            StartEvent = input.StartEvent,
            Ended = input.Ended,
            EndEvent = input.EndEvent,
            CurrentTask = new()
            {
                Started = input.CurrentTask.Started,
                Ended = input.CurrentTask.Ended,
                Flow = input.CurrentTask.Flow,
                Name = input.CurrentTask.Name,
                Validated = new()
                {
                    Timestamp = input.CurrentTask.Validated.Timestamp,
                    CanCompleteTask = input.CurrentTask.Validated.CanCompleteTask,
                },
                ElementId = input.CurrentTask.ElementId,
                FlowType = input.CurrentTask.FlowType,
                AltinnTaskType = input.CurrentTask.AltinnTaskType,
                Actions = new Dictionary<string, bool>(),
                HasReadAccess = false,
                HasWriteAccess = false,
            },
        };
        AppProcessState actual = new(input);
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void Constructor_with_ProcessState_copies_values_validated_null()
    {
        ProcessState input = new ProcessState()
        {
            Started = DateTime.Now,
            StartEvent = "StartEvent",
            Ended = DateTime.Now,
            EndEvent = "EndEvent",
            CurrentTask = new()
            {
                Started = DateTime.Now,
                Ended = DateTime.Now,
                Flow = 2,
                Name = "Utfylling",
                Validated = null,
                ElementId = "Task_1",
                FlowType = "FlowType",
                AltinnTaskType = AltinnTaskTypes.Data,
            },
        };
        AppProcessState expected = new AppProcessState()
        {
            Started = input.Started,
            StartEvent = input.StartEvent,
            Ended = input.Ended,
            EndEvent = input.EndEvent,
            CurrentTask = new()
            {
                Started = input.CurrentTask.Started,
                Ended = input.CurrentTask.Ended,
                Flow = input.CurrentTask.Flow,
                Name = input.CurrentTask.Name,
                Validated = null,
                ElementId = input.CurrentTask.ElementId,
                FlowType = input.CurrentTask.FlowType,
                AltinnTaskType = input.CurrentTask.AltinnTaskType,
                Actions = new Dictionary<string, bool>(),
                HasReadAccess = false,
                HasWriteAccess = false,
            },
        };
        AppProcessState actual = new(input);
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void Constructor_with_ProcessState_copies_values_currenttask_null()
    {
        ProcessState input = new ProcessState()
        {
            Started = DateTime.Now,
            StartEvent = "StartEvent",
            Ended = DateTime.Now,
            EndEvent = "EndEvent",
            CurrentTask = null,
        };
        AppProcessState expected = new AppProcessState()
        {
            Started = input.Started,
            StartEvent = input.StartEvent,
            Ended = input.Ended,
            EndEvent = input.EndEvent,
            CurrentTask = null,
        };
        AppProcessState actual = new(input);
        actual.Should().BeEquivalentTo(expected);
    }
}
