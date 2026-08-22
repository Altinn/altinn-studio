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
        // The synthesized PrintMembers would read the throwing Mailbox getter, so ToString would throw from a
        // debug log or a debugger watch.
        var context = CreateContext(waitDeadline: null);

        string? rendered = null;
        Exception? thrown = Record.Exception(() => rendered = context.ToString());

        Assert.Null(thrown);
        Assert.NotNull(rendered);
        Assert.Contains("Mailbox = <none>", rendered, StringComparison.Ordinal);
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

    [Fact]
    public void ToString_WithNoReply_DoesNotThrowAndReadsNone()
    {
        // Reply and ReplyClosedReason have the same throwing shape, so PrintMembers must not read them either.
        var context = CreateContext(waitDeadline: null) with
        {
            ReplyUnavailableReason = "this task is not answered by a message",
        };

        string? rendered = null;
        Exception? thrown = Record.Exception(() => rendered = context.ToString());

        Assert.Null(thrown);
        Assert.NotNull(rendered);
        Assert.Contains("Reply = <none>", rendered, StringComparison.Ordinal);
        // The properties themselves still throw — the fix must not degrade into non-throwing getters.
        Assert.Throws<InvalidOperationException>(() => context.Reply);
        Assert.Throws<InvalidOperationException>(() => context.ReplyClosedReason);
    }

    [Fact]
    public void ToString_WithAReply_RendersTheMessage()
    {
        var context = CreateContext(waitDeadline: null) with
        {
            ReplyOrDefault = new ServiceTaskReply
            {
                Payload = "<receipt/>",
                IdempotencyKey = "source-message-7",
                AcceptedAt = DateTimeOffset.UtcNow,
                Position = 2,
            },
        };

        string rendered = context.ToString();

        Assert.Contains("source-message-7", rendered, StringComparison.Ordinal);
        Assert.Null(context.ReplyClosedReason);
    }

    [Fact]
    public void ToString_WithAClosedMailbox_RendersTheClosure()
    {
        var context = CreateContext(waitDeadline: null) with
        {
            MailboxClosedReasonOrDefault = MailboxClosedReason.Deadline,
        };

        string rendered = context.ToString();

        Assert.Contains("Reply = <closed: Deadline>", rendered, StringComparison.Ordinal);
        Assert.Null(context.Reply);
        Assert.Equal(MailboxClosedReason.Deadline, context.ReplyClosedReason);
    }
}
