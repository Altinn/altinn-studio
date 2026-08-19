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

    [Fact]
    public void ToString_WithNoMailbox_DoesNotThrowAndReadsNone()
    {
        // The record's synthesized PrintMembers would read every public property, including the
        // computed Mailbox whose getter throws when no mailbox was minted — which is almost every
        // execution. A custom PrintMembers must keep ToString safe (a debug log, a debugger watch, an
        // assertion-failure message all call it) and print the mailbox as <none>.
        var context = CreateContext(waitDeadline: null);

        string? rendered = null;
        Exception? thrown = Record.Exception(() => rendered = context.ToString());

        Assert.Null(thrown);
        Assert.NotNull(rendered);
        Assert.Contains("Mailbox = <none>", rendered, StringComparison.Ordinal);
        // Reading the property itself still throws — ToString is the only thing that must not.
        Assert.Throws<InvalidOperationException>(() => context.Mailbox);
    }

    [Fact]
    public void ToString_WithMailbox_RendersTheAddress()
    {
        var mailbox = new ServiceTaskMailbox { Id = Guid.NewGuid(), Deadline = DateTimeOffset.UtcNow.AddDays(3) };
        var context = CreateContext(waitDeadline: null) with { MailboxOrDefault = mailbox };

        string rendered = context.ToString();

        Assert.Contains(mailbox.Id.ToString(), rendered, StringComparison.Ordinal);
        Assert.DoesNotContain("<none>", rendered, StringComparison.Ordinal);
    }
}
