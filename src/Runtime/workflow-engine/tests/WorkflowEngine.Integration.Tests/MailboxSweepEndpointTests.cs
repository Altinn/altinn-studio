using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers the deadline sweep against a live engine: a mailbox nobody closed reaches its deadline, the sweep
/// closes it, and the receiver that was parked on it actually runs. The sweep is driven directly rather than
/// waited for — its cadence is coarse by design, and what this file is about is the path from a passed deadline
/// to a running receiver on a real host. The cadence itself is pinned in <c>MailboxSweepTests</c>.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class MailboxSweepEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    /// <summary>
    /// Short enough that a test can outlive it, long enough that the calls setting the exchange up land while the
    /// mailbox is still open. The deadline is derived from the mint instant, so this is the only way to produce an
    /// overdue mailbox through the public surface.
    /// </summary>
    private static readonly TimeSpan _shortTimeout = TimeSpan.FromSeconds(1);

    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _helpers = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task SweptMailbox_ClosesAtItsDeadline_AndItsParkedReceiverRuns()
    {
        // Without the sweep the receiver would sit Held forever: it is unfetchable and has no timer of its own.
        // The sweep closes the mailbox, the closure releases the receiver in the same transaction.
        var mailbox = await _client.MintMailbox("step-1", _shortTimeout);
        var receiver = await EnqueueHeldReceiver(mailbox.Id);

        await WaitForDeadline(mailbox);
        var result = await Sweep();

        Assert.Equal(1, result.Closed);
        Assert.Equal(1, result.ReceiversReleased);

        var closed = await _client.GetMailbox(mailbox.Id);
        Assert.NotNull(closed);
        Assert.Equal(MailboxStatus.Disposed, closed.Status);
        Assert.Equal(MailboxDisposedReason.Deadline, closed.DisposedReason);

        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));
    }

    [Fact]
    public async Task SweptMailbox_RefusesFurtherDeliveries_AsAClosedMailboxDoes()
    {
        // Closed is closed, however it happened. A forwarder that answers after the deadline gets the same "too
        // late" it would get after a DELETE, which is what makes 409 unambiguous.
        var mailbox = await _client.MintMailbox("step-1", _shortTimeout);

        await WaitForDeadline(mailbox);
        Assert.Equal(1, (await Sweep()).Closed);

        using var late = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = "{}" }
        );
        Assert.Equal(System.Net.HttpStatusCode.Conflict, late.StatusCode);
    }

    [Fact]
    public async Task SweptMailbox_CountsItsClosureAsDeadline_AndTheDeliveriesNobodyRead()
    {
        // The reason tag separates exchanges that concluded on their own from ones that ran out of time; the
        // unconsumed count is the only place a message that arrived too late is ever reported, since a mailbox
        // closing at its deadline has no caller to report it to.
        var mailbox = await _client.MintMailbox("step-1", _shortTimeout);
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-2");

        await WaitForDeadline(mailbox);

        using var collector = new TelemetryCollector();
        Assert.Equal(1, (await Sweep()).Closed);

        var closure = Assert.Single(collector.GetMeasurements("engine.mailboxes.closed"));
        Assert.Equal("deadline", closure.Tags.Single(t => t.Key == "reason").Value);

        var unconsumed = Assert.Single(collector.GetMeasurements("engine.mailboxes.deliveries.unconsumed"));
        Assert.Equal(2L, Convert.ToInt64(unconsumed.Value, CultureInfo.InvariantCulture));
    }

    /// <summary>Runs one pass of the sweep the host has running, rather than waiting out its cadence.</summary>
    private async Task<MailboxSweepResult> Sweep()
    {
        var repository = fixture.Services.GetRequiredService<IEngineRepository>();
        return await repository.SweepOverdueMailboxes(
            DateTimeOffset.UtcNow,
            MailboxDeadlineService.SweepBatchSize,
            TestContext.Current.CancellationToken
        );
    }

    private static async Task WaitForDeadline(MailboxResponse mailbox)
    {
        var remaining = mailbox.Deadline - DateTimeOffset.UtcNow;
        if (remaining > TimeSpan.Zero)
            await Task.Delay(remaining + TimeSpan.FromMilliseconds(200), TestContext.Current.CancellationToken);
    }

    private async Task<Guid> EnqueueHeldReceiver(Guid mailboxId)
    {
        var request = _helpers.CreateWorkflow("receiver", [_helpers.CreateWebhookStep("/receive")]) with
        {
            Mailbox = new MailboxReference { Id = mailboxId },
        };

        var accepted = await _client.Enqueue(_helpers.CreateEnqueueRequest(request), idempotencyKey: "receiver");
        var workflowId = Assert.Single(accepted.Workflows).DatabaseId;

        var status = await _client.GetWorkflow(workflowId);
        Assert.Equal(PersistentItemStatus.Held, status!.OverallStatus);

        return workflowId;
    }
}
