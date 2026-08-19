using System.Globalization;
using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers the rendezvous against a live engine: a held receiver released by its delivery or by the
/// mailbox closing actually runs, the release survives a lost <c>NOTIFY</c>, and the release metrics say
/// which of the two causes did it.
/// </summary>
/// <remarks>
/// What a released receiver <em>does</em> today is deliberately ordinary, and pinned here as such: it is
/// an ordinary workflow whose steps execute in order, and the engine does not yet hand its first step the
/// delivery. <c>mailbox_id</c> is a column nothing reads at execution time. Step 6 gives the executor the
/// waiter's position and the delivery at it; until then, "released" means exactly "runnable".
/// </remarks>
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
        // The flip of step 3's characterization: a held receiver used to stay held while the engine ran,
        // because nothing released it. Now the delivery does, in its own transaction, and the workflow the
        // wake produces is an ordinary runnable workflow — fetched, executed, completed.
        //
        // And that is precisely as far as this step goes. The step it runs is a plain webhook and it is
        // called with the payload the enqueue gave it, not with the message that woke it: the executor
        // does not read deliveries yet (step 6). "Released" means "runnable", nothing more.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueHeldReceiver(mailbox.Id);

        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");

        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed);

        Assert.Contains(fixture.WireMock.LogEntries, e => e.RequestMessage.Path == "/receive");
    }

    [Fact]
    public async Task Close_ReleasesAHeldReceiver_WhichThenRunsWithNoDelivery()
    {
        // Closure is the other release, and the exchange's graceful ending: the app disposes the mailbox
        // and the receiver it left parked runs anyway, on the no-delivery path. The mailbox reports the
        // reason it closed, which is what the callback will eventually carry — a conclusion that says
        // "the exchange was closed" reads differently from one that says "nothing arrived in time".
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
        // The unconsumed count on the close's own response — the operator's view of what turned up too
        // late to be read. It survives the whole serialization path here, rather than only existing in
        // the repository result.
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
        // Races table: a crash after the wake commits and before the NOTIFY reaches anyone. The design
        // insists the notification is acceleration and never correctness, and this is where that is
        // cashed: the release below is applied straight to the database — the exact statement the wake
        // runs, committed, with no notification of any kind — and the processor has to find the receiver
        // on its own next fetch cycle.
        //
        // A workflow released this way is indistinguishable from one the engine released and failed to
        // announce, which is the whole point: nothing downstream of the release depends on the signal.
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
        // The two tag values partition the counter exactly, because exactly two things release a
        // receiver. Read against the `held` births, this is the relay's balance sheet: every parked
        // receiver leaves by one of these two doors, and a `closed` share that climbs means exchanges are
        // ending without their last message.
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
        // The number that shows the wake is doing its job rather than merely happening: how long the
        // engine took to turn "this receiver may run" into "a worker has it". Nothing else measures that
        // gap — a held receiver is invisible to every workflow-latency metric until the moment it is
        // released.
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

    #endregion

    /// <summary>
    /// Applies the wake's own release statement directly and commits it, with no notification — standing
    /// in for an engine that crashed in the window between the two.
    /// </summary>
    private async Task ReleaseWithoutNotifying(Guid receiverId)
    {
        await using var context = fixture.GetDbContext();
        await context.Database.ExecuteSqlAsync(
            $"""
            WITH released AS (
                UPDATE engine.workflows AS w
                SET status = {(int)PersistentItemStatus.Enqueued}, backoff_until = NULL, updated_at = now()
                FROM engine.mailbox_waiters AS mw
                WHERE mw.workflow_id = {receiverId}
                  AND mw.released_at IS NULL
                  AND w.id = mw.workflow_id
                  AND w.status = {(int)PersistentItemStatus.Held}
                RETURNING w.id
            )
            UPDATE engine.mailbox_waiters AS mw
            SET released_at = now()
            FROM released
            WHERE mw.workflow_id = released.id
            """,
            TestContext.Current.CancellationToken
        );
    }
}
