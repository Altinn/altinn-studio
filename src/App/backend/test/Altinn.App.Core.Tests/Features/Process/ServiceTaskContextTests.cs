using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Moq;

namespace Altinn.App.Core.Tests.Features.Process;

public class ServiceTaskContextTests
{
    private static ServiceTaskContext CreateContext(DateTimeOffset? waitDeadline) =>
        new() { InstanceDataMutator = Mock.Of<IInstanceDataMutator>(), WaitDeadline = waitDeadline };

    [Fact]
    public void BeforeFirstDeferral_NoDeadline_ReportsNoRemainingWaitAndNotFinal()
    {
        var context = CreateContext(waitDeadline: null);

        Assert.Null(context.RemainingWait);
        Assert.False(context.IsFinalCheck);
    }

    [Fact]
    public void DeadlineAhead_ReportsPositiveRemainingWaitAndNotFinal()
    {
        var context = CreateContext(DateTimeOffset.UtcNow.AddHours(1));

        Assert.NotNull(context.RemainingWait);
        Assert.InRange(context.RemainingWait.Value, TimeSpan.FromMinutes(59), TimeSpan.FromHours(1));
        Assert.False(context.IsFinalCheck);
    }

    [Fact]
    public void DeadlinePassed_ReportsZeroRemainingWaitAndFinalCheck()
    {
        // The engine schedules the final re-check at the deadline itself, so a task that runs at or
        // past it must read "spent", never a negative remainder.
        var context = CreateContext(DateTimeOffset.UtcNow.AddMinutes(-5));

        Assert.Equal(TimeSpan.Zero, context.RemainingWait);
        Assert.True(context.IsFinalCheck);
    }

    [Fact]
    public async Task Checkpoints_OutsideTheRuntime_RoundTripInMemory()
    {
        // A context constructed directly (an app's unit test) gets working checkpoint semantics with
        // no setup: values round-trip within the context, nothing is persisted.
        var context = CreateContext(waitDeadline: null);

        Assert.Null(await context.GetCheckpoint("receipt"));

        await context.SetCheckpoint("receipt", "r-42");

        Assert.Equal("r-42", await context.GetCheckpoint("receipt"));
    }
}
