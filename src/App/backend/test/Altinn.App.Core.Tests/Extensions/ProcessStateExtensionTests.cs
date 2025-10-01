#nullable disable
using Altinn.App.Core.Extensions;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Extensions;

public class ProcessStateExtensionTests
{
    [Fact]
    public void Copy_returns_copy_of_process_state()
    {
        ProcessState original = new ProcessState();
        ProcessState copy = original.Copy();
        Assert.NotSame(original, copy);
    }

    [Fact]
    public void Copy_returns_state_with_fields_set()
    {
        ProcessState original = new ProcessState()
        {
            Ended = DateTime.Now,
            Started = DateTime.Now,
            StartEvent = "StartEvent",
            EndEvent = "EndEvent",
            CurrentTask = new ProcessElementInfo()
            {
                Ended = DateTime.Now,
                Started = DateTime.Now,
                ElementId = "ElementId",
                AltinnTaskType = "AltinnTaskType",
                Flow = 1,
                FlowType = "FlowType",
                Name = "Name",
                Validated = new ValidationStatus() { Timestamp = DateTime.Now, CanCompleteTask = true },
            },
        };
        ProcessState copy = original.Copy();
        Assert.NotSame(original, copy);
        Assert.NotSame(original.CurrentTask, copy.CurrentTask);
        Assert.Same(original.CurrentTask.Validated, copy.CurrentTask.Validated);
        copy.Should().BeEquivalentTo(original);
    }

    [Fact]
    public void Copy_returns_state_with_current_null_when_original_null()
    {
        ProcessState original = new ProcessState()
        {
            Ended = DateTime.Now,
            Started = DateTime.Now,
            StartEvent = "StartEvent",
            EndEvent = "EndEvent",
            CurrentTask = null,
        };
        ProcessState copy = original.Copy();
        Assert.NotSame(original, copy);
        Assert.Same(original.CurrentTask, copy.CurrentTask);
        copy.Should().BeEquivalentTo(original);
    }
}
