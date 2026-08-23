using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Moq;

namespace Altinn.App.Core.Tests.Features.Process;

public class ServiceTaskContextTests
{
    private static ServiceTaskContext CreateContext(DateTimeOffset? waitDeadline) =>
        new()
        {
            InstanceDataMutator = Mock.Of<IInstanceDataMutator>(),
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
            Wait = new ServiceTaskWait { Deadline = waitDeadline },
        };

    [Fact]
    public void BeforeFirstDeferral_NoDeadline_ReportsNoRemainingWaitAndNotFinal()
    {
        var context = CreateContext(waitDeadline: null);

        Assert.Null(context.Wait.Remaining);
        Assert.False(context.Wait.IsFinalCheck);
    }

    [Fact]
    public void DeadlineAhead_ReportsPositiveRemainingWaitAndNotFinal()
    {
        var context = CreateContext(DateTimeOffset.UtcNow.AddHours(1));

        Assert.NotNull(context.Wait.Remaining);
        Assert.InRange(context.Wait.Remaining.Value, TimeSpan.FromMinutes(59), TimeSpan.FromHours(1));
        Assert.False(context.Wait.IsFinalCheck);
    }

    [Fact]
    public void DeadlinePassed_ReportsZeroRemainingWaitAndFinalCheck()
    {
        // The engine schedules the final re-check at the deadline itself, so a task that runs at or
        // past it must read "spent", never a negative remainder.
        var context = CreateContext(DateTimeOffset.UtcNow.AddMinutes(-5));

        Assert.Equal(TimeSpan.Zero, context.Wait.Remaining);
        Assert.True(context.Wait.IsFinalCheck);
    }
}
