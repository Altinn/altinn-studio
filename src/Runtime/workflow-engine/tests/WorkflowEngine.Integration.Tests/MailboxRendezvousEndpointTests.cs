using System.Globalization;
using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers the rendezvous against a live engine: a held receiver released by its delivery or by the mailbox
/// closing actually runs, the release survives a lost <c>NOTIFY</c>, and the release metrics say which cause
/// did it. What the first step is <em>handed</em> belongs to <c>MailboxReceiptEndpointTests</c>, which is why
/// the receivers below run plain webhook steps that read nothing.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class MailboxRendezvousEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _helpers = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private Task<MailboxResponse> MintMailbox(string key = "step-1") => _client.MintMailbox(key, TimeSpan.FromHours(1));

    private WorkflowRequest Receiver(Guid mailboxId, string path = "/receive") =>
        _helpers.CreateWorkflow("receiver", [_helpers.CreateWebhookStep(path)]) with
        {
            Mailbox = new MailboxReference { Id = mailboxId },
        };

    private async Task<Guid> EnqueueHeldReceiver(Guid mailboxId, string path = "/receive", string key = "receiver")
    {
        var accepted = await _client.Enqueue(
            _helpers.CreateEnqueueRequest(Receiver(mailboxId, path)),
            idempotencyKey: key
        );
        var workflowId = Assert.Single(accepted.Workflows).DatabaseId;

        var status = await _client.GetWorkflow(workflowId);
        Assert.Equal(PersistentItemStatus.Held, status!.OverallStatus);

        return workflowId;
    }

    #region Released receivers run

    [Fact]
    public async Task Delivery_WakesAHeldReceiver_WhichThenRunsItsStepsLikeAnyOtherWorkflow()
    {
        // Scoped to the release itself: the step it runs is a plain webhook, called with the payload the enqueue
        // gave it. That the executor also hands a receive step the message that woke it is tested separately.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueHeldReceiver(mailbox.Id);

        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");

        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed);

        Assert.Contains(fixture.WireMock.LogEntries, e => e.RequestMessage.Path == "/receive");
    }

    [Fact]
    public async Task Close_ReleasesAHeldReceiver_WhichThenRunsWithNoDelivery()
    {
        // Closure is the other release, and the exchange's graceful ending. The mailbox reports the reason it
        // closed, which is what the callback will eventually carry.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueHeldReceiver(mailbox.Id);

        var closed = await _client.CloseMailbox(mailbox.Id);

        Assert.Equal(MailboxStatus.Disposed, closed.Status);
        Assert.Equal(MailboxDisposedReason.Request, closed.DisposedReason);

        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task Close_ReportsHowManyDeliveriesNobodyWasEnqueuedFor()
    {
        // The unconsumed count on the close's own response, surviving the whole serialization path rather than
        // only existing in the repository result.
        var mailbox = await MintMailbox();
        await EnqueueHeldReceiver(mailbox.Id);
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-2");
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-3");

        var closed = await _client.CloseMailbox(mailbox.Id);

        Assert.Equal(3L, closed.NextIdx);
        Assert.Equal(1L, closed.NextSeq);
        Assert.Equal(2L, closed.UnconsumedDeliveries);
    }

    #endregion

    #region NOTIFY is acceleration only

    [Fact]
    public async Task WakeThatCommittedWithoutItsNotify_IsStillClaimedOnTheNextFetchCycle()
    {
        // Races table: a crash after the wake commits and before the NOTIFY reaches anyone. The release below is
        // applied straight to the database — the exact statement the wake runs, committed, with no notification
        // — so the processor has to find the receiver on its own next fetch cycle.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueHeldReceiver(mailbox.Id);

        await ReleaseWithoutNotifying(receiver);

        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));
    }

    #endregion

    #region Telemetry

    [Fact]
    public async Task ReleasedReceiversAreCountedByTheCauseThatReleasedThem()
    {
        // The two tag values partition the counter exactly, because exactly two things release a receiver. Read
        // against the `held` births, this is the relay's balance sheet.
        var delivered = await MintMailbox("step-delivered");
        var closed = await MintMailbox("step-closed");
        await EnqueueHeldReceiver(delivered.Id, "/delivered", "receiver-delivered");
        await EnqueueHeldReceiver(closed.Id, "/closed", "receiver-closed");

        using var collector = new TelemetryCollector();

        await _client.DeliverToMailbox(delivered.Id, "source-msg-1");
        await _client.CloseMailbox(closed.Id);

        // A delivery with nobody waiting for it is not a release, and neither is a repeated close.
        await _client.DeliverToMailbox(delivered.Id, "source-msg-2");
        (await _client.CloseMailboxRaw(closed.Id)).Dispose();

        var byCause = collector
            .GetMeasurements("engine.mailboxes.receivers.released")
            .GroupBy(m => (string)m.Tags.Single(t => t.Key == "cause").Value!)
            .ToDictionary(g => g.Key, g => g.Sum(m => Convert.ToInt64(m.Value, CultureInfo.InvariantCulture)));

        Assert.Equal(new Dictionary<string, long> { ["delivered"] = 1, ["closed"] = 1 }, byCause);
    }

    [Fact]
    public async Task WakeToClaimLatencyIsRecordedWhenAWokenReceiverIsPickedUp()
    {
        // Nothing else measures this gap: a held receiver is invisible to every workflow-latency metric until the
        // moment it is released.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueHeldReceiver(mailbox.Id);

        using var collector = new TelemetryCollector();

        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed);

        var latencies = collector.GetMeasurements("engine.mailboxes.receivers.wake_latency");
        var recorded = Assert.Single(latencies);
        Assert.True(
            Convert.ToDouble(recorded.Value, CultureInfo.InvariantCulture) >= 0,
            "Wake-to-claim latency was recorded as a negative duration."
        );
    }

    [Fact]
    public async Task WakeToClaimLatencyIsNotRecordedForAReceiverThatNeverWaited()
    {
        // A receiver born with its delivery is claimed and run exactly like a woken one and carries a release
        // stamp just as one does, so the only thing keeping it out of this histogram is `held_at`. It matters
        // because the birth case is common whenever a counterparty answers before the relay's next hop is
        // enqueued — timing those would fill a sub-second histogram with fetch-cycle latency.
        var mailbox = await MintMailbox();
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");

        using var collector = new TelemetryCollector();

        var accepted = await _client.Enqueue(
            _helpers.CreateEnqueueRequest(Receiver(mailbox.Id, "/receive")),
            idempotencyKey: "born-runnable"
        );
        var receiver = Assert.Single(accepted.Workflows).DatabaseId;
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed);

        Assert.Empty(collector.GetMeasurements("engine.mailboxes.receivers.wake_latency"));
    }

    #endregion

    /// <summary>
    /// The wake's whole transaction with the notification left out: the counter bumped, the message appended at the
    /// receiver's position, and the receiver released — committed, silently. The message half is not decoration: a
    /// receiver released with nothing at its position on an open mailbox is a state the rendezvous cannot produce,
    /// and the engine now refuses it rather than running the step.
    /// </summary>
    private async Task ReleaseWithoutNotifying(Guid receiverId)
    {
        await using var context = fixture.GetDbContext();
        await context.Database.ExecuteSqlAsync(
            $"""
            WITH bumped AS (
                UPDATE engine.mailboxes AS m
                SET next_idx = m.next_idx + 1
                FROM engine.mailbox_receivers AS mr
                WHERE mr.workflow_id = {receiverId} AND m.id = mr.mailbox_id
                RETURNING m.id AS mailbox_id, m.next_idx - 1 AS idx
            ),
            delivered AS (
                INSERT INTO engine.mailbox_deliveries (mailbox_id, idx, idempotency_key, payload, accepted_at)
                SELECT b.mailbox_id, b.idx, 'source-msg-unnotified', 'unnotified', now() FROM bumped b
                RETURNING mailbox_id, idx
            ),
            released AS (
                UPDATE engine.workflows AS w
                SET status = {(int)PersistentItemStatus.Enqueued}, backoff_until = NULL, updated_at = now()
                FROM engine.mailbox_receivers AS mr, delivered AS d
                WHERE mr.workflow_id = {receiverId}
                  AND mr.released_at IS NULL
                  AND mr.mailbox_id = d.mailbox_id
                  AND mr.seq = d.idx
                  AND w.id = mr.workflow_id
                  AND w.status = {(int)PersistentItemStatus.Held}
                RETURNING w.id
            )
            UPDATE engine.mailbox_receivers AS mr
            SET released_at = now()
            FROM released
            WHERE mr.workflow_id = released.id
            """,
            TestContext.Current.CancellationToken
        );
    }
}
