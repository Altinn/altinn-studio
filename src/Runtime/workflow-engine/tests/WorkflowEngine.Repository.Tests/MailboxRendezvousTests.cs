using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers the two releases of a parked receiver and the transaction each shares with its cause. The
/// atomicity claims are proved by transaction id — observing the pair stays green on a split transaction.
/// </summary>
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
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        Assert.Equal(PersistentItemStatus.Held, await StatusOf(receiver));

        var accepted = Assert.IsType<MailboxDeliveryResult.Accepted>(await Deliver(repository, mailbox.Id, "msg-1"));

        Assert.Equal(0L, accepted.Delivery.Idx);
        Assert.True(accepted.ReleasedReceiver);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));

        var row = await WorkflowRow(receiver);
        Assert.Null(row.BackoffUntil);

        var registration = await Registration(receiver);
        Assert.NotNull(registration.ReleasedAt);
        Assert.Null(registration.ClaimedAt);
    }

    [Fact]
    public async Task Delivery_AtAPositionNobodyIsWaitingAt_ReleasesNothing()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var accepted = Assert.IsType<MailboxDeliveryResult.Accepted>(await Deliver(repository, mailbox.Id, "msg-1"));

        Assert.False(accepted.ReleasedReceiver);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxReceivers.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Delivery_ReleasesOnlyTheReceiverStandingAtItsOwnPosition()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var first = await EnqueueReceiver(repository, mailbox.Id, "r0");
        var second = await EnqueueReceiver(repository, mailbox.Id, "r1");

        await Deliver(repository, mailbox.Id, "msg-1");

        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(first));
        Assert.Equal(PersistentItemStatus.Held, await StatusOf(second));
        Assert.NotNull((await Registration(first)).ReleasedAt);
        Assert.Null((await Registration(second)).ReleasedAt);

        await Deliver(repository, mailbox.Id, "msg-2");

        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(second));
    }

    [Fact]
    public async Task Delivery_AndTheWakeItPerforms_ShareOneTransactionId()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Deliver(repository, mailbox.Id, "msg-1");

        var deliveryTx = await TransactionId("engine.mailbox_deliveries", "mailbox_id", mailbox.Id);
        var workflowTx = await TransactionId("engine.workflows", "id", receiver);
        var registrationTx = await TransactionId("engine.mailbox_receivers", "workflow_id", receiver);

        Assert.Equal(deliveryTx, workflowTx);
        Assert.Equal(deliveryTx, registrationTx);
    }

    [Fact]
    public async Task Delivery_Replayed_ReleasesNothingASecondTime()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Deliver(repository, mailbox.Id, "msg-1");
        var firstRelease = (await Registration(receiver)).ReleasedAt;

        var replay = Assert.IsType<MailboxDeliveryResult.Duplicate>(await Deliver(repository, mailbox.Id, "msg-1"));

        Assert.Equal(0L, replay.Delivery.Idx);
        Assert.Equal(firstRelease, (await Registration(receiver)).ReleasedAt);
    }

    [Fact]
    public async Task Delivery_ConcurrentDeliveries_EachReleaseTheReceiverAtTheirOwnPosition()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receivers = new List<Guid>();
        for (int i = 0; i < 8; i++)
            receivers.Add(await EnqueueReceiver(repository, mailbox.Id, $"r{i}"));

        var senders = Enumerable.Range(0, 8).Select(_ => fixture.CreateRepository()).ToArray();
        var results = await Task.WhenAll(senders.Select((r, i) => Deliver(r, mailbox.Id, $"msg-{i}")));

        Assert.All(results, r => Assert.True(Assert.IsType<MailboxDeliveryResult.Accepted>(r).ReleasedReceiver));

        await using var context = fixture.CreateDbContext();
        var registrations = await context.MailboxReceivers.ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(8, registrations.Count);
        Assert.All(registrations, r => Assert.NotNull(r.ReleasedAt));
        Assert.Equal([0L, 1, 2, 3, 4, 5, 6, 7], registrations.Select(r => r.Seq).Order());

        foreach (var receiver in receivers)
            Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));
    }

    #endregion

    #region The closure release

    [Fact]
    public async Task Close_ReleasesEveryParkedReceiver()
    {
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

            Assert.Equal(closed.Mailbox.DisposedAt, (await Registration(receiver)).ReleasedAt);
        }
    }

    [Fact]
    public async Task Close_AndTheReceiversItReleases_ShareOneTransactionId()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Close(repository, mailbox.Id);

        var mailboxTx = await TransactionId("engine.mailboxes", "id", mailbox.Id);
        var workflowTx = await TransactionId("engine.workflows", "id", receiver);
        var registrationTx = await TransactionId("engine.mailbox_receivers", "workflow_id", receiver);

        Assert.Equal(mailboxTx, workflowTx);
        Assert.Equal(mailboxTx, registrationTx);
    }

    [Fact]
    public async Task Close_ReportsTheDeliveriesNoReceiverWasEverEnqueuedFor()
    {
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
        Assert.Equal(unclaimed, closed.Mailbox.UnpairedDeliveries);
    }

    [Fact]
    public async Task Close_WithMoreReceiversThanDeliveries_ReportsNoneUnpaired()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await EnqueueReceiver(repository, mailbox.Id, "r0");
        await EnqueueReceiver(repository, mailbox.Id, "r1");
        await Deliver(repository, mailbox.Id, "msg-0");

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        Assert.Equal(0L, closed.Mailbox.UnpairedDeliveries);
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
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var woken = await EnqueueReceiver(repository, mailbox.Id, "r0");
        var parked = await EnqueueReceiver(repository, mailbox.Id, "r1");
        await Deliver(repository, mailbox.Id, "msg-1");
        var wakeInstant = (await Registration(woken)).ReleasedAt;

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await Close(repository, mailbox.Id));

        Assert.Equal(1, closed.Released.Closed);
        Assert.Equal(wakeInstant, (await Registration(woken)).ReleasedAt);
        Assert.Equal(closed.Mailbox.DisposedAt, (await Registration(parked)).ReleasedAt);
    }

    [Fact]
    public async Task Close_LeavesAReleasedReceiverThatIsAlreadyRunning()
    {
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
        Assert.Null((await Registration(running)).ReleasedAt);
    }

    [Fact]
    public async Task Close_Repeated_ReleasesNothingAndKeepsTheOriginalDisposal()
    {
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
        Assert.Equal(first.Mailbox.DisposedAt, (await Registration(receiver)).ReleasedAt);
    }

    [Fact]
    public async Task Close_ConcurrentClosesWithDifferentReasons_ReleaseEachReceiverExactlyOnce()
    {
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
            .MailboxReceivers.Select(w => w.ReleasedAt)
            .Distinct()
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(closed.Mailbox.DisposedAt, Assert.Single(stamps));
    }

    #endregion

    #region The mailbox row is the serialization point

    [Fact]
    public async Task Close_BlockedBehindAnInFlightDelivery_SeesTheReceiverThatDeliveryWoke()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var woken = await EnqueueReceiver(repository, mailbox.Id, "r0");
        var parked = await EnqueueReceiver(repository, mailbox.Id, "r1");

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var deliveryTx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);

        await ExecuteInFlightDelivery(blocker, deliveryTx, mailbox.Id, woken);

        var close = Close(repository, mailbox.Id);
        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(close.IsCompleted, "The close reached a verdict while an in-flight delivery held the row lock.");

        await deliveryTx.CommitAsync(TestContext.Current.CancellationToken);

        var closed = Assert.IsType<MailboxCloseResult.Closed>(await close);
        Assert.Equal(1, closed.Released.Closed);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(woken));
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(parked));
        Assert.Equal(closed.Mailbox.DisposedAt, (await Registration(parked)).ReleasedAt);
        Assert.NotEqual(closed.Mailbox.DisposedAt, (await Registration(woken)).ReleasedAt);
    }

    [Fact]
    public async Task Close_BlockedBehindAnInFlightReceiverEnqueue_ReleasesTheRegistrationItLeftBehind()
    {
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
        // Hold the receiver's workflow row, then start a delivery that must wake it: if the lock order is
        // mailbox-then-workflow, a third session's NOWAIT probe on the mailbox row fails while it waits.
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
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "msg-1");

        await Deliver(repository, mailbox.Id, "msg-2");
        await Deliver(repository, mailbox.Id, "msg-1");

        await using var context = fixture.CreateDbContext();
        var registration = await Registration(receiver);
        var atItsPosition = await context.MailboxDeliveries.SingleAsync(
            d => d.MailboxId == mailbox.Id && d.Idx == registration.Seq,
            TestContext.Current.CancellationToken
        );

        Assert.Equal("msg-1", atItsPosition.IdempotencyKey);
    }

    #endregion

    #region Wake-to-claim measurement

    [Fact]
    public async Task FetchAndLock_StampsAWokenReceiversClaimExactlyOnce()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "msg-1");

        Assert.Single(await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken));
        var firstClaim = (await Registration(receiver)).ClaimedAt;
        Assert.NotNull(firstClaim);

        await ForceStatus(receiver, PersistentItemStatus.Enqueued);
        Assert.Single(await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken));

        Assert.Equal(firstClaim, (await Registration(receiver)).ClaimedAt);
    }

    [Fact]
    public async Task FetchAndLock_LeavesAReceiverBornRunnableUnmeasured()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "msg-1");
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        using var wakeLatency = new WakeLatencyCollector();

        Assert.Single(await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken));

        Assert.Empty(wakeLatency.Samples);

        var registration = await Registration(receiver);
        Assert.Equal(0L, registration.Seq);
        Assert.Null(registration.HeldAt);
        Assert.NotNull(registration.ReleasedAt);

        Assert.NotNull(registration.ClaimedAt);
    }

    [Fact]
    public async Task FetchAndLock_MeasuresAWokenReceiver()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "msg-1");

        using var wakeLatency = new WakeLatencyCollector();

        Assert.Single(await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken));

        var sample = Assert.Single(wakeLatency.Samples);
        Assert.True(sample >= 0, "Wake-to-claim latency was recorded as a negative duration.");
    }

    [Fact]
    public async Task FetchAndLock_OfOrdinaryWorkflows_IssuesNoMailboxStatementAtAll()
    {
        var interceptor = new SqlCapturingInterceptor();
        var repository = fixture.CreateRepositoryWithInterceptor(interceptor);
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "msg-1");
        await EnqueueOrdinary(repository);

        await ForceStatus(receiver, PersistentItemStatus.Held);
        interceptor.Clear();
        await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken);

        Assert.DoesNotContain(interceptor.Queries, q => q.Sql.Contains("mailbox_receivers", StringComparison.Ordinal));

        await ForceStatus(receiver, PersistentItemStatus.Enqueued);
        interceptor.Clear();
        await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken);

        Assert.Single(interceptor.Queries, q => q.Sql.Contains("mailbox_receivers", StringComparison.Ordinal));
        Assert.NotNull((await Registration(receiver)).ClaimedAt);
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

    private async Task<MailboxReceiverEntity> Registration(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        return await context.MailboxReceivers.SingleAsync(
            w => w.WorkflowId == workflowId,
            TestContext.Current.CancellationToken
        );
    }

    private async Task ForceStatus(Guid workflowId, PersistentItemStatus status)
    {
        await using var context = fixture.CreateDbContext();
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.workflows SET status = {(int)status}, lease_token = NULL WHERE id = {workflowId}",
            TestContext.Current.CancellationToken
        );
    }

    /// <summary>Constructs a state the engine never produces, to isolate the release's other guard.</summary>
    private async Task ClearReleaseStamp(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        await context.Database.ExecuteSqlAsync(
            $"UPDATE engine.mailbox_receivers SET released_at = NULL WHERE workflow_id = {workflowId}",
            TestContext.Current.CancellationToken
        );
    }

    /// <summary>
    /// The transaction that last wrote a row (<c>xmin</c>): equal ids across rows prove one transaction wrote
    /// them all.
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

    /// <summary>The uncommitted state of a delivery that has appended and woken its receiver.</summary>
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
            UPDATE engine.mailbox_receivers SET released_at = now()
            FROM woken WHERE mailbox_receivers.workflow_id = woken.id
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
    /// The uncommitted state of an enqueue flush that parked a receiver. The row shape must match the flush's
    /// exactly, <c>held_at</c> included.
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
            INSERT INTO engine.mailbox_receivers (mailbox_id, seq, workflow_id, held_at, released_at)
            SELECT @id, bumped.seq, born.id, now(), NULL FROM bumped, born
            """,
            conn,
            tx
        );
#pragma warning restore CA2100
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("receiver", receiverId));
        await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>
    /// Collects the wake-to-claim histogram's samples; a local listener because this project does not
    /// reference the TestKit.
    /// </summary>
    private sealed class WakeLatencyCollector : IDisposable
    {
        private readonly MeterListener _listener;
        private readonly ConcurrentBag<double> _samples = [];

        public WakeLatencyCollector()
        {
            _listener = new MeterListener();
            _listener.InstrumentPublished = (instrument, listener) =>
            {
                if (instrument.Meter.Name == Metrics.Meter.Name && instrument.Name == WakeLatencyInstrument)
                    listener.EnableMeasurementEvents(instrument);
            };
            _listener.SetMeasurementEventCallback<double>((_, measurement, _, _) => _samples.Add(measurement));
            _listener.Start();
        }

        public IReadOnlyCollection<double> Samples => [.. _samples];

        public void Dispose() => _listener.Dispose();
    }

    private const string WakeLatencyInstrument = "engine.mailboxes.receivers.wake_latency";

    #endregion
}
