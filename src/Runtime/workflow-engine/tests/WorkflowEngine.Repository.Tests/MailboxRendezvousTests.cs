using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers the rendezvous itself: the two — and only two — things that release a parked receiver, the
/// transaction each of them shares with its cause, and every row of the design's races table that is
/// decided in the database rather than in a live engine.
/// </summary>
/// <remarks>
/// A held receiver has no timer of its own. That is the design's central bet, and it is only payable
/// because a release cannot be lost: the wake is inside the delivery's transaction, the closure release
/// is inside the close's, and the mailbox row lock leaves no interleaving in which a message is durable
/// and its wake is not. Tests that observe the pair from outside cannot establish that — they stay green
/// on a split transaction — so the atomicity claims here are proved by transaction id.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class MailboxRendezvousTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "rendezvous-ns";

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    #region The wake

    [Fact]
    public async Task Delivery_AtAParkedReceiversPosition_ReleasesItInTheSameCall()
    {
        // The rendezvous, in its simplest shape. The receiver was born held because nothing sat at its
        // position; the delivery that lands there is what makes it runnable, and the same call that
        // accepted the message reports having done so.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        Assert.Equal(PersistentItemStatus.Held, await StatusOf(receiver));

        var accepted = Assert.IsType<MailboxDeliveryResult.Accepted>(await Deliver(repository, mailbox.Id, "msg-1"));

        Assert.Equal(0L, accepted.Delivery.Idx);
        Assert.True(accepted.ReleasedReceiver);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));

        // Released to the front of the fetch order, exactly as v2 released a held link: a null backoff
        // sorts first under `backoff_until NULLS FIRST`, so the receiver runs on the next cycle rather
        // than behind whatever timers happen to be pending.
        var row = await WorkflowRow(receiver);
        Assert.Null(row.BackoffUntil);

        var waiter = await Waiter(receiver);
        Assert.NotNull(waiter.ReleasedAt);
        Assert.Null(waiter.ClaimedAt);
    }

    [Fact]
    public async Task Delivery_AtAPositionNobodyIsWaitingAt_ReleasesNothing()
    {
        // The other half of the pair step 2 pinned as a gap: acceptance is still not consumption. A
        // message that arrives before its receiver simply sits at its position, and the enqueue's own
        // `seq < next_idx` comparison under the same lock is what finds it.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var accepted = Assert.IsType<MailboxDeliveryResult.Accepted>(await Deliver(repository, mailbox.Id, "msg-1"));

        Assert.False(accepted.ReleasedReceiver);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxWaiters.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Delivery_ReleasesOnlyTheReceiverStandingAtItsOwnPosition()
    {
        // FIFO is the two gapless counters and nothing else — no dependency edges, no ordering column.
        // The delivery at position 0 therefore belongs to the receiver at seq 0 and to no other, and the
        // receiver at seq 1 stays parked with a message already in the mailbox.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var first = await EnqueueReceiver(repository, mailbox.Id, "r0");
        var second = await EnqueueReceiver(repository, mailbox.Id, "r1");

        await Deliver(repository, mailbox.Id, "msg-1");

        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(first));
        Assert.Equal(PersistentItemStatus.Held, await StatusOf(second));
        Assert.NotNull((await Waiter(first)).ReleasedAt);
        Assert.Null((await Waiter(second)).ReleasedAt);

        // And the second message reaches the second receiver, in order, without either of them knowing
        // the other exists.
        await Deliver(repository, mailbox.Id, "msg-2");

        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(second));
    }

    [Fact]
    public async Task Delivery_AndTheWakeItPerforms_ShareOneTransactionId()
    {
        // The step's central claim, and the one that cannot be established by observation. Polling the
        // delivery row and the workflow row from outside would stay green if the wake were moved into a
        // second transaction after the insert — two reads have essentially no chance of landing inside
        // that window — and yet that split is exactly the bug worth catching: a held receiver has no
        // timer, so a message that is durable while its wake is lost parks the receiver until the
        // mailbox's deadline with its answer sitting one row away.
        //
        // PostgreSQL records the transaction that last wrote each row in xmin. Equal xmin across the
        // delivery, the woken workflow and the waiter's release stamp therefore *is* the proof, and it
        // goes red the moment any of the three leaves the delivery's transaction.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Deliver(repository, mailbox.Id, "msg-1");

        var deliveryTx = await TransactionId("engine.mailbox_deliveries", "mailbox_id", mailbox.Id);
        var workflowTx = await TransactionId("engine.workflows", "id", receiver);
        var waiterTx = await TransactionId("engine.mailbox_waiters", "workflow_id", receiver);

        Assert.Equal(deliveryTx, workflowTx);
        Assert.Equal(deliveryTx, waiterTx);
    }

    [Fact]
    public async Task Delivery_Replayed_ReleasesNothingASecondTime()
    {
        // Races table: a duplicate idempotency key replays the original position. It must not replay the
        // wake with it — the receiver it woke may already be running, or done, and a second release
        // would either resurrect a settled workflow or overwrite the instant the first release recorded.
        // The replay refuses before it reaches the append, so neither can happen; this pins that the
        // guards, not the ordering, are what make it true.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Deliver(repository, mailbox.Id, "msg-1");
        var firstRelease = (await Waiter(receiver)).ReleasedAt;

        var replay = Assert.IsType<MailboxDeliveryResult.Duplicate>(await Deliver(repository, mailbox.Id, "msg-1"));

        Assert.Equal(0L, replay.Delivery.Idx);
        Assert.Equal(firstRelease, (await Waiter(receiver)).ReleasedAt);
    }

    [Fact]
    public async Task Delivery_ConcurrentDeliveries_EachReleaseTheWaiterAtTheirOwnPosition()
    {
        // Races table: two deliveries ingested concurrently. Step 2 pinned that the positions stay
        // gapless; the wake adds a second thing that must not be scrambled by the interleaving, since
        // each delivery is now responsible for exactly one receiver. Every receiver ends up released
        // exactly once, and no position is released twice.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receivers = new List<Guid>();
        for (int i = 0; i < 8; i++)
            receivers.Add(await EnqueueReceiver(repository, mailbox.Id, $"r{i}"));

        var senders = Enumerable.Range(0, 8).Select(_ => fixture.CreateRepository()).ToArray();
        var results = await Task.WhenAll(senders.Select((r, i) => Deliver(r, mailbox.Id, $"msg-{i}")));

        Assert.All(results, r => Assert.True(Assert.IsType<MailboxDeliveryResult.Accepted>(r).ReleasedReceiver));

        await using var context = fixture.CreateDbContext();
        var waiters = await context.MailboxWaiters.ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(8, waiters.Count);
        Assert.All(waiters, w => Assert.NotNull(w.ReleasedAt));
        Assert.Equal([0L, 1, 2, 3, 4, 5, 6, 7], waiters.Select(w => w.Seq).Order());

        foreach (var receiver in receivers)
            Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));
    }

    #endregion

    #region The closure release

    [Fact]
    public async Task Close_ReleasesEveryParkedReceiver()
    {
        // Closure is the design's other exit, and it releases *every* waiter rather than the next one:
        // the mailbox can accept no further deliveries, so every parked receiver's truth is frozen at the
        // same instant and each of them has to run the no-delivery path. Leaving any behind would leave a
        // receiver nothing could ever release.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receivers = new List<Guid>();
        for (int i = 0; i < 3; i++)
            receivers.Add(await EnqueueReceiver(repository, mailbox.Id, $"r{i}"));

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        Assert.Equal(3, closed.Released.Closed);

        foreach (var receiver in receivers)
        {
            Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));

            // Stamped with the close's own instant, so the waiter row says which closure released it.
            Assert.Equal(closed.Mailbox.DisposedAt, (await Waiter(receiver)).ReleasedAt);
        }
    }

    [Fact]
    public async Task Close_AndTheReceiversItReleases_ShareOneTransactionId()
    {
        // The closure release carries the same atomicity requirement as the wake and for the same
        // reason: a mailbox that is durably closed while a receiver stays held is a receiver nothing can
        // ever release — the close is idempotent, so no retry would revisit it. Proved by transaction id
        // rather than observed, for the reason the wake's twin explains.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Close(repository, mailbox.Id);

        var mailboxTx = await TransactionId("engine.mailboxes", "id", mailbox.Id);
        var workflowTx = await TransactionId("engine.workflows", "id", receiver);
        var waiterTx = await TransactionId("engine.mailbox_waiters", "workflow_id", receiver);

        Assert.Equal(mailboxTx, workflowTx);
        Assert.Equal(mailboxTx, waiterTx);
    }

    [Fact]
    public async Task Close_ReportsTheDeliveriesNoReceiverWasEverEnqueuedFor()
    {
        // The one leftover class the design handles rather than assumes away: messages accepted at
        // positions no receiver ever claimed — they arrived while the app was concluding, or past the
        // relay's last hop. The close reports them so an operator can see what turned up too late, and
        // the number is checked here against the rows themselves rather than trusted from the arithmetic
        // that derives it.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await EnqueueReceiver(repository, mailbox.Id, "r0");
        for (int i = 0; i < 4; i++)
            await Deliver(repository, mailbox.Id, $"msg-{i}");

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        await using var context = fixture.CreateDbContext();
        var unclaimed = await context
            .MailboxDeliveries.Where(d => d.MailboxId == mailbox.Id && d.Idx >= closed.Mailbox.NextSeq)
            .CountAsync(TestContext.Current.CancellationToken);

        Assert.Equal(3, unclaimed);
        Assert.Equal(unclaimed, closed.Mailbox.UnconsumedDeliveries);
    }

    [Fact]
    public async Task Close_WithMoreReceiversThanDeliveries_ReportsNoneUnconsumed()
    {
        // The other side of the same arithmetic, and the reason it is a `max(0, …)`: receivers that
        // outnumber deliveries mean messages that never came, not messages nobody read. Every one of
        // those receivers is released here and concludes on the no-delivery path.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await EnqueueReceiver(repository, mailbox.Id, "r0");
        await EnqueueReceiver(repository, mailbox.Id, "r1");
        await Deliver(repository, mailbox.Id, "msg-0");

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        Assert.Equal(0L, closed.Mailbox.UnconsumedDeliveries);
        Assert.Equal(1, closed.Released.Closed);
    }

    [Fact]
    public async Task Close_WithNothingParked_ReleasesNothing()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        Assert.Equal(0, closed.Released.Closed);
    }

    [Fact]
    public async Task Close_LeavesAReceiverItsOwnDeliveryAlreadyWoke()
    {
        // Races table: closure versus a receiver that is no longer parked. Its truth was frozen when the
        // wake released it, so the close must neither re-release it nor restamp the instant that says
        // *why* it became runnable — the difference between "your message arrived" and "no message ever
        // will" is the whole content of the callback the app is about to get.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var woken = await EnqueueReceiver(repository, mailbox.Id, "r0");
        var parked = await EnqueueReceiver(repository, mailbox.Id, "r1");
        await Deliver(repository, mailbox.Id, "msg-1");
        var wakeInstant = (await Waiter(woken)).ReleasedAt;

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        Assert.Equal(1, closed.Released.Closed);
        Assert.Equal(wakeInstant, (await Waiter(woken)).ReleasedAt);
        Assert.Equal(closed.Mailbox.DisposedAt, (await Waiter(parked)).ReleasedAt);
    }

    [Fact]
    public async Task Close_LeavesAReleasedReceiverThatIsAlreadyRunning()
    {
        // Races table: closure versus an in-flight (Processing) receiver. A close that reset it to
        // Enqueued would hand a second worker a workflow another is already executing.
        //
        // What actually keeps it out of the release here is the *release stamp*: the wake wrote
        // released_at when it made this receiver runnable, and the closure release only walks waiters
        // that carry none. The status guard is a second, independent reason and is pinned separately
        // below — dropping either one alone leaves this test green, which is precisely why the claim
        // that "the status guard makes this safe" would have been wrong.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var running = await EnqueueReceiver(repository, mailbox.Id, "r0");
        var parked = await EnqueueReceiver(repository, mailbox.Id, "r1");
        await Deliver(repository, mailbox.Id, "msg-1");

        var claimed = await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken);
        Assert.Equal(running, Assert.Single(claimed).DatabaseId);
        Assert.Equal(PersistentItemStatus.Processing, await StatusOf(running));

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        Assert.Equal(1, closed.Released.Closed);
        Assert.Equal(PersistentItemStatus.Processing, await StatusOf(running));
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(parked));
    }

    [Fact]
    public async Task Close_LeavesARunningReceiverAloneEvenWithNoReleaseStampToExcludeIt()
    {
        // The status guard on its own, with the release stamp deliberately taken away so that nothing
        // else can be doing the work. The state below is one a correct engine cannot reach — a receiver
        // is only Processing because a release made it runnable, and that release stamped the waiter —
        // so it is constructed rather than arrived at, exactly so that one guard stands alone.
        //
        // What it defends is worth the artificial setup: the release writes to engine.workflows through
        // a join, and `status = Held` is the only thing in that statement that knows the difference
        // between a workflow parked and a workflow being executed by a worker holding its lease.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var running = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "msg-1");

        var claimed = await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken);
        Assert.Equal(running, Assert.Single(claimed).DatabaseId);
        await ClearReleaseStamp(running);

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        Assert.Equal(0, closed.Released.Closed);
        Assert.Equal(PersistentItemStatus.Processing, await StatusOf(running));
        Assert.Null((await Waiter(running)).ReleasedAt);
    }

    [Fact]
    public async Task Close_Repeated_ReleasesNothingAndKeepsTheOriginalDisposal()
    {
        // Races table: a DELETE racing the deadline sweep. Both run this same routine under this same
        // lock, so the second one finds a disposed mailbox and does nothing at all — it neither
        // overwrites the reason and instant the first recorded, nor re-releases receivers the first
        // released, which by then may be running or settled.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        var first = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));
        var second = Assert.IsType<MailboxCloseResult.AlreadyClosed>(
            await Close(repository, mailbox.Id, MailboxDisposedReason.Deadline)
        );

        Assert.Equal(1, first.Released.Closed);
        Assert.Equal(MailboxDisposedReason.Request, second.Mailbox.DisposedReason);
        Assert.Equal(first.Mailbox.DisposedAt, second.Mailbox.DisposedAt);
        Assert.Equal(first.Mailbox.DisposedAt, (await Waiter(receiver)).ReleasedAt);
    }

    [Fact]
    public async Task Close_ConcurrentClosesWithDifferentReasons_ReleaseEachReceiverExactlyOnce()
    {
        // The same idempotence under real contention rather than in sequence, and with the two reasons
        // that will race in production once the sweep exists. Whoever wins the mailbox row lock does the
        // whole routine; the losers find it disposed and add nothing.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        for (int i = 0; i < 4; i++)
            await EnqueueReceiver(repository, mailbox.Id, $"r{i}");

        var closers = Enumerable.Range(0, 8).Select(_ => fixture.CreateRepository()).ToArray();
        var results = await Task.WhenAll(
            closers.Select(
                (r, i) =>
                    Close(r, mailbox.Id, i % 2 == 0 ? MailboxDisposedReason.Request : MailboxDisposedReason.Deadline)
            )
        );

        var closed = Assert.Single(results.OfType<MailboxCloseResult.Closed>());
        Assert.Equal(4, closed.Released.Closed);

        await using var context = fixture.CreateDbContext();
        var stamps = await context
            .MailboxWaiters.Select(w => w.ReleasedAt)
            .Distinct()
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(closed.Mailbox.DisposedAt, Assert.Single(stamps));
    }

    #endregion

    #region The mailbox row is the serialization point

    [Fact]
    public async Task Close_BlockedBehindAnInFlightDelivery_SeesTheReceiverThatDeliveryWoke()
    {
        // Races table, delivery versus closure — the interleaving step 2 could not pin, because closure
        // had no release half to observe. Delivery-first: the message is accepted and its receiver woken,
        // and the close that was waiting behind it finds one fewer receiver to release. The alternative
        // the lock rules out is the dangerous one — a close that read the mailbox before the delivery
        // committed would release the receiver as "no message will ever come" while its message was
        // already durable at its position.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var woken = await EnqueueReceiver(repository, mailbox.Id, "r0");
        var parked = await EnqueueReceiver(repository, mailbox.Id, "r1");

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var deliveryTx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);

        // Stands in for the delivery's own transaction, mid-flight: mailbox row locked, message appended
        // at position 0, waiter released — the exact state DeliverToMailbox holds just before it commits.
        await ExecuteInFlightDelivery(blocker, deliveryTx, mailbox.Id, woken);

        var close = Close(repository, mailbox.Id);
        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(close.IsCompleted, "The close reached a verdict while an in-flight delivery held the row lock.");

        await deliveryTx.CommitAsync(TestContext.Current.CancellationToken);

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await close);
        Assert.Equal(1, closed.Released.Closed);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(woken));
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(parked));
        Assert.Equal(closed.Mailbox.DisposedAt, (await Waiter(parked)).ReleasedAt);
        Assert.NotEqual(closed.Mailbox.DisposedAt, (await Waiter(woken)).ReleasedAt);
    }

    [Fact]
    public async Task Close_BlockedBehindAnInFlightReceiverEnqueue_ReleasesTheWaiterItLeftBehind()
    {
        // Races table, closure versus a receiver being born — the interleaving step 3 left to this step,
        // where closure gained something to do about it. Enqueue-first: the receiver parks, and the close
        // waiting behind it releases the waiter the enqueue had just registered. Neither order can strand
        // it, which is what lets the app enqueue a successor without checking whether the mailbox is
        // still open.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var enqueueTx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);

        var receiver = Guid.CreateVersion7();
        await ExecuteInFlightReceiverEnqueue(blocker, enqueueTx, mailbox.Id, receiver);

        var close = Close(repository, mailbox.Id);
        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(close.IsCompleted, "The close reached a verdict while an in-flight enqueue held the row lock.");

        await enqueueTx.CommitAsync(TestContext.Current.CancellationToken);

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await close);
        Assert.Equal(1, closed.Released.Closed);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));
    }

    [Fact]
    public async Task Wake_HoldsTheMailboxRowWhileItWaitsForTheReceiversWorkflowRow()
    {
        // The compound lock order, asserted rather than described. The design's one compound acquisition
        // is mailbox row → workflow row, and the whole "acyclic by inspection" argument rests on nothing
        // ever taking them the other way round: an inspection is only as good as the direction actually
        // being what it says.
        //
        // So: hold the receiver's *workflow* row, then start a delivery that must wake it. If the order
        // is mailbox-then-workflow, the delivery is now stuck on the workflow row while still holding the
        // mailbox row — which a third session can detect, because its own NOWAIT attempt on the mailbox
        // row fails instead of succeeding. An implementation that took the workflow row first, or that
        // released the mailbox row before waking, would let that attempt through.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var workflowTx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);
        await using (
            var lockCmd = new NpgsqlCommand(
                "SELECT id FROM engine.workflows WHERE id = @id FOR UPDATE",
                blocker,
                workflowTx
            )
        )
        {
            lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", receiver));
            await lockCmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        var delivery = Deliver(repository, mailbox.Id, "msg-1");
        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(delivery.IsCompleted, "The delivery committed without waiting for the receiver's workflow row.");

        await using (var probe = new NpgsqlConnection(fixture.ConnectionString))
        {
            await probe.OpenAsync(TestContext.Current.CancellationToken);
            await using var probeTx = await probe.BeginTransactionAsync(TestContext.Current.CancellationToken);
            await using var probeCmd = new NpgsqlCommand(
                "SELECT id FROM engine.mailboxes WHERE id = @id FOR UPDATE NOWAIT",
                probe,
                probeTx
            );
            probeCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));

            var refused = await Assert.ThrowsAsync<PostgresException>(async () =>
                await probeCmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken)
            );

            Assert.Equal(PostgresErrorCodes.LockNotAvailable, refused.SqlState);
            await probeTx.RollbackAsync(TestContext.Current.CancellationToken);
        }

        await workflowTx.RollbackAsync(TestContext.Current.CancellationToken);

        Assert.True(Assert.IsType<MailboxDeliveryResult.Accepted>(await delivery).ReleasedReceiver);
    }

    #endregion

    #region Delivery existence is frozen from first fetchability

    [Fact]
    public async Task ReceiverReleasedByClosure_CanNeverBeGivenADeliveryAfterwards()
    {
        // Races table: a delivery versus the retry of a failed receiver. The design refuses to solve that
        // with bookkeeping and solves it structurally instead — a receiver released by closure runs on a
        // mailbox that refuses every further delivery, so its position can never be filled, and every
        // attempt and retry re-derives the same absence from the same rows. Pinned here as a property of
        // the database; step 6 owns the executor side of it.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Close(repository, mailbox.Id);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));

        var late = Assert.IsType<MailboxDeliveryResult.Closed>(await Deliver(repository, mailbox.Id, "msg-1"));
        Assert.Equal(MailboxDisposedReason.Request, late.Mailbox.DisposedReason);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxDeliveries.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task ReceiverReleasedByItsDelivery_KeepsThatDeliveryWhateverArrivesLater()
    {
        // The freeze from the other direction. A woken receiver's position holds the message that woke
        // it, and nothing can replace it: positions are a primary key, later messages take later
        // positions, and a resend of the same message replays the position it already has. So the answer
        // a retry re-derives is the answer the first attempt saw.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "msg-1");

        await Deliver(repository, mailbox.Id, "msg-2");
        await Deliver(repository, mailbox.Id, "msg-1");

        await using var context = fixture.CreateDbContext();
        var waiter = await Waiter(receiver);
        var atItsPosition = await context.MailboxDeliveries.SingleAsync(
            d => d.MailboxId == mailbox.Id && d.Idx == waiter.Seq,
            TestContext.Current.CancellationToken
        );

        Assert.Equal("msg-1", atItsPosition.IdempotencyKey);
    }

    #endregion

    #region Wake-to-claim measurement

    [Fact]
    public async Task FetchAndLock_StampsAWokenReceiversClaimExactlyOnce()
    {
        // The measurement's honesty, not its value. The stamp is what makes wake-to-claim latency mean
        // "how long the release took to become a running workflow" rather than "how long ago the release
        // was" — without it a receiver that fails and climbs its retry ladder would report the whole
        // ladder as wake latency on every claim, and the percentiles of a metric that exists to show a
        // sub-second gap would be measuring the retry strategy.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "msg-1");

        Assert.Single(await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken));
        var firstClaim = (await Waiter(receiver)).ClaimedAt;
        Assert.NotNull(firstClaim);

        // Back to runnable, as a retry or a resume would leave it, and claimed again.
        await ForceStatus(receiver, PersistentItemStatus.Enqueued);
        Assert.Single(await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken));

        Assert.Equal(firstClaim, (await Waiter(receiver)).ClaimedAt);
    }

    [Fact]
    public async Task FetchAndLock_LeavesAReceiverBornRunnableUnmeasured()
    {
        // A receiver born with its delivery was never woken, so there is nothing to time: it registers no
        // waiter at all. Pinned because the natural mistake is to measure "mailbox receiver claimed",
        // which would fold the birth case into the histogram and hide exactly the latency it exists for.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "msg-1");
        await EnqueueReceiver(repository, mailbox.Id);

        Assert.Single(await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken));

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxWaiters.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task FetchAndLock_OfOrdinaryWorkflows_IssuesNoMailboxStatementAtAll()
    {
        // The hot path's price, unchanged. The claim query itself is untouched by this step — the
        // measurement runs afterwards, on the ids that query already returned — and a batch holding no
        // receiver returns from it before issuing any SQL. Asserted over the statements actually sent
        // rather than over their effect, because a statement that matches nothing has the same effect as
        // no statement and a very different cost on the engine's busiest loop.
        var interceptor = new SqlCapturingInterceptor();
        var repository = fixture.CreateRepositoryWithInterceptor(interceptor);
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "msg-1");
        await EnqueueOrdinary(repository);

        // The ordinary workflow alone: the receiver is parked out of reach behind its Held status.
        await ForceStatus(receiver, PersistentItemStatus.Held);
        interceptor.Clear();
        await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken);

        // `mailbox_id` rides the entity load as an ordinary column and always will; what must be absent
        // is any statement against the rendezvous tables.
        Assert.DoesNotContain(interceptor.Queries, q => q.Sql.Contains("mailbox_waiters", StringComparison.Ordinal));

        // The same fetch with the receiver runnable: exactly one statement, and it is the measurement.
        await ForceStatus(receiver, PersistentItemStatus.Enqueued);
        interceptor.Clear();
        await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken);

        Assert.Single(interceptor.Queries, q => q.Sql.Contains("mailbox_waiters", StringComparison.Ordinal));
        Assert.NotNull((await Waiter(receiver)).ClaimedAt);
    }

    #endregion

    #region Helpers

    private static async Task<MailboxResponse> MintMailbox(EngineRepository repository, string key = "mailbox-key") =>
        Assert
            .IsType<MailboxMintResult.Minted>(
                await repository.MintMailbox(
                    Guid.CreateVersion7(),
                    Ns,
                    key,
                    collectionKey: null,
                    TimeSpan.FromHours(1),
                    DateTimeOffset.UtcNow,
                    maxOpenPerCollection: 100,
                    TestContext.Current.CancellationToken
                )
            )
            .Mailbox;

    private static Task<MailboxDeliveryResult> Deliver(EngineRepository repository, Guid mailboxId, string key) =>
        repository.DeliverToMailbox(
            mailboxId,
            Ns,
            key,
            payload: "{}",
            DateTimeOffset.UtcNow,
            maxLogLength: 100,
            TestContext.Current.CancellationToken
        );

    private static Task<MailboxCloseResult> Close(
        EngineRepository repository,
        Guid mailboxId,
        MailboxDisposedReason reason = MailboxDisposedReason.Request
    ) => repository.CloseMailbox(mailboxId, Ns, reason, DateTimeOffset.UtcNow, TestContext.Current.CancellationToken);

    private static WorkflowRequest ReceiverRequest(Guid mailboxId) =>
        new()
        {
            OperationId = "receive",
            Mailbox = new MailboxReference { Id = mailboxId },
            Steps =
            [
                new StepRequest
                {
                    OperationId = "handle-reply",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };

    private static async Task<Guid> EnqueueReceiver(
        EngineRepository repository,
        Guid mailboxId,
        string idempotencyKey = "receiver"
    )
    {
        var results = await Enqueue(repository, [ReceiverRequest(mailboxId)], idempotencyKey);
        return Assert.Single(Assert.Single(results).WorkflowIds!);
    }

    private static async Task<Guid> EnqueueOrdinary(EngineRepository repository)
    {
        var workflow = new WorkflowRequest
        {
            OperationId = "ordinary",
            Steps =
            [
                new StepRequest
                {
                    OperationId = "do-something",
                    Command = new CommandDefinition { Type = "app" },
                },
            ],
        };

        var results = await Enqueue(repository, [workflow], Guid.NewGuid().ToString("N"));
        return Assert.Single(Assert.Single(results).WorkflowIds!);
    }

    private static Task<BatchEnqueueResult[]> Enqueue(
        EngineRepository repository,
        IReadOnlyList<WorkflowRequest> workflows,
        string idempotencyKey
    )
    {
        var metadata = new WorkflowRequestMetadata(Ns, idempotencyKey, null, DateTimeOffset.UtcNow, null);
        return repository.BatchEnqueueWorkflows(
            [
                new BufferedEnqueueRequest(
                    new WorkflowEnqueueRequest { Workflows = workflows },
                    metadata,
                    SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyKey)),
                    new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously)
                ),
            ],
            TestContext.Current.CancellationToken
        );
    }

    private async Task<PersistentItemStatus> StatusOf(Guid workflowId) => (await WorkflowRow(workflowId)).Status;

    private async Task<WorkflowEntity> WorkflowRow(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        return await context.Workflows.SingleAsync(w => w.Id == workflowId, TestContext.Current.CancellationToken);
    }

    private async Task<MailboxWaiterEntity> Waiter(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        return await context.MailboxWaiters.SingleAsync(
            w => w.WorkflowId == workflowId,
            TestContext.Current.CancellationToken
        );
    }

    /// <summary>
    /// Moves a workflow to <paramref name="status"/> without going through the engine, standing in for a
    /// state a test needs to start from rather than reach.
    /// </summary>
    private async Task ForceStatus(Guid workflowId, PersistentItemStatus status)
    {
        await using var context = fixture.CreateDbContext();
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET status = {(int)status}, lease_token = NULL WHERE id = {workflowId}",
            TestContext.Current.CancellationToken
        );
    }

    /// <summary>
    /// Takes a waiter's release stamp away again, so a test can isolate the release statement's other
    /// guard. Constructs a state the engine itself never produces.
    /// </summary>
    private async Task ClearReleaseStamp(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.mailbox_waiters SET released_at = NULL WHERE workflow_id = {workflowId}",
            TestContext.Current.CancellationToken
        );
    }

    /// <summary>
    /// The transaction that last wrote a row, as PostgreSQL recorded it in <c>xmin</c>. Equal ids across
    /// two rows mean one transaction wrote both — the only way to establish atomicity from outside, since
    /// any test that merely observes the pair stays green when the transaction is split.
    /// </summary>
    private async Task<string> TransactionId(string table, string column, Guid id)
    {
        await using var conn = new NpgsqlConnection(fixture.ConnectionString);
        await conn.OpenAsync(TestContext.Current.CancellationToken);

        // The table and column are test-supplied literals naming engine tables, never request data.
#pragma warning disable CA2100
        await using var cmd = new NpgsqlCommand($"SELECT xmin::text FROM {table} WHERE {column} = @id", conn);
#pragma warning restore CA2100
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", id));

        var value = await cmd.ExecuteScalarAsync(TestContext.Current.CancellationToken);
        return Assert.IsType<string>(value);
    }

    /// <summary>
    /// The exact statements a delivery holds uncommitted at the moment it has appended a message and
    /// woken the receiver at that position: the mailbox row locked, the counter bumped, the message
    /// inserted, the workflow released and the waiter stamped.
    /// </summary>
    private static async Task ExecuteInFlightDelivery(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        Guid receiverId
    )
    {
        // Interpolated from status constants only; there is no caller-supplied text in it.
#pragma warning disable CA2100
        await using var cmd = new NpgsqlCommand(
            $"""
            WITH locked AS (
                SELECT id FROM engine.mailboxes WHERE id = @id FOR UPDATE
            ),
            bumped AS (
                UPDATE engine.mailboxes SET next_idx = next_idx + 1
                WHERE id = (SELECT id FROM locked)
                RETURNING next_idx - 1 AS idx
            ),
            inserted AS (
                INSERT INTO engine.mailbox_deliveries (mailbox_id, idx, idempotency_key, payload, accepted_at)
                SELECT @id, bumped.idx, 'msg-1', @payload, now() FROM bumped
                RETURNING idx
            ),
            woken AS (
                UPDATE engine.workflows SET status = {(int)PersistentItemStatus.Enqueued}, backoff_until = NULL
                WHERE id = @receiver AND EXISTS (SELECT 1 FROM inserted)
                RETURNING id
            )
            UPDATE engine.mailbox_waiters SET released_at = now()
            FROM woken WHERE mailbox_waiters.workflow_id = woken.id
            """,
            conn,
            tx
        );
#pragma warning restore CA2100
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("receiver", receiverId));
        cmd.Parameters.Add(new NpgsqlParameter<string>("payload", "{}"));
        await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>
    /// The state an enqueue flush holds uncommitted once it has parked a receiver: the mailbox row
    /// locked, the receivers counter advanced, the workflow row written <c>Held</c> and its waiter
    /// registered.
    /// </summary>
    private static async Task ExecuteInFlightReceiverEnqueue(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        Guid receiverId
    )
    {
        // Interpolated from status constants only; there is no caller-supplied text in it.
#pragma warning disable CA2100
        await using var cmd = new NpgsqlCommand(
            $"""
            WITH locked AS (
                SELECT id FROM engine.mailboxes WHERE id = @id FOR UPDATE
            ),
            bumped AS (
                UPDATE engine.mailboxes SET next_seq = next_seq + 1
                WHERE id = (SELECT id FROM locked)
                RETURNING next_seq - 1 AS seq
            ),
            born AS (
                INSERT INTO engine.workflows (
                    id, operation_id, idempotency_key, namespace, status, created_at, reclaim_count, mailbox_id
                )
                SELECT @receiver, 'receive', @receiver::text, '{Ns}', {(int)PersistentItemStatus.Held}, now(), 0, @id
                RETURNING id
            )
            INSERT INTO engine.mailbox_waiters (mailbox_id, seq, workflow_id, released_at)
            SELECT @id, bumped.seq, born.id, NULL FROM bumped, born
            """,
            conn,
            tx
        );
#pragma warning restore CA2100
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("receiver", receiverId));
        await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
    }

    #endregion
}
