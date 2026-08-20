using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers receive-workflow birth against a real database: the position each receiver consumes, the state
/// it is born in, the two interleavings of a delivery and its receiver's enqueue, and the row lock that
/// leaves no third.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MailboxReceiverTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "receiver-ns";

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

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

    private static async Task<long> Deliver(EngineRepository repository, Guid mailboxId, string key) =>
        Assert
            .IsType<MailboxDeliveryResult.Accepted>(
                await repository.DeliverToMailbox(
                    mailboxId,
                    Ns,
                    key,
                    payload: "{}",
                    DateTimeOffset.UtcNow,
                    maxLogLength: 100,
                    TestContext.Current.CancellationToken
                )
            )
            .Delivery.Idx;

    private static WorkflowRequest Receiver(Guid mailboxId, string? @ref = null) =>
        new()
        {
            Ref = @ref,
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

    private static WorkflowRequest Ordinary(string? @ref = null) =>
        new()
        {
            Ref = @ref,
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

    private static Task<BatchEnqueueResult[]> Enqueue(
        EngineRepository repository,
        IReadOnlyList<WorkflowRequest> workflows,
        string? idempotencyKey = null,
        string ns = Ns
    )
    {
        var key = idempotencyKey ?? Guid.NewGuid().ToString("N");
        var metadata = new WorkflowRequestMetadata(ns, key, null, DateTimeOffset.UtcNow, null);
        return repository.BatchEnqueueWorkflows([Buffered(metadata, workflows)], TestContext.Current.CancellationToken);
    }

    private async Task<PersistentItemStatus> StatusOf(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        return await context
            .Workflows.Where(w => w.Id == workflowId)
            .Select(w => w.Status)
            .SingleAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>
    /// The registry row's system transaction id. Two reads returning the same value is proof the row was not
    /// written between them, which an equality check on its columns is not: an <c>UPDATE</c> writing the values
    /// already there still produces a new version.
    /// </summary>
    private async Task<uint> RegistrationVersion(Guid workflowId)
    {
        await using var conn = new NpgsqlConnection(fixture.ConnectionString);
        await conn.OpenAsync(TestContext.Current.CancellationToken);
        await using var cmd = new NpgsqlCommand(
            "SELECT xmin::text::bigint FROM engine.mailbox_receivers WHERE workflow_id = @id",
            conn
        );
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", workflowId));
        return (uint)(long)(await cmd.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
    }

    #region The registry holds every receiver

    [Fact]
    public async Task Enqueue_MixedBirthsInOneFlush_LeaveOneRegistrationEachAndAgreeWithTheCounter()
    {
        // All three births in one flush against one mailbox, the arrangement that would expose an off-by-one
        // between the positions the plan hands out, the rows it writes, and the counter it advances.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "msg-1");
        await Deliver(repository, mailbox.Id, "msg-2");

        var result = Assert.Single(
            await Enqueue(
                repository,
                [Receiver(mailbox.Id, "first"), Receiver(mailbox.Id, "second"), Receiver(mailbox.Id, "third")]
            )
        );

        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);
        var workflowIds = result.WorkflowIds!;
        Assert.Equal(3, workflowIds.Length);

        await using var context = fixture.CreateDbContext();
        var registry = await context
            .MailboxReceivers.Where(r => r.MailboxId == mailbox.Id)
            .OrderBy(r => r.Seq)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.Equal(3, registry.Count);
        Assert.Equal([0L, 1L, 2L], registry.Select(r => r.Seq));
        Assert.Equal(workflowIds, registry.Select(r => r.WorkflowId));

        // held_at is the only thing that says which.
        Assert.Null(registry[0].HeldAt);
        Assert.Null(registry[1].HeldAt);
        Assert.NotNull(registry[2].HeldAt);
        Assert.NotNull(registry[0].ReleasedAt);
        Assert.NotNull(registry[1].ReleasedAt);
        Assert.Null(registry[2].ReleasedAt);

        Assert.Equal(
            [PersistentItemStatus.Enqueued, PersistentItemStatus.Enqueued, PersistentItemStatus.Held],
            await Task.WhenAll(workflowIds.Select(StatusOf))
        );

        // The counter is the registry's length, which is what makes gaplessness a property of the log rather
        // than of the plan that wrote it.
        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.Equal(registry.Count, afterwards!.NextSeq);
    }

    [Fact]
    public async Task AReceiverBornRunnable_IsUntouchedByTheWakeAndByTheClosureRelease()
    {
        // Both releases walk this table and both must pass a born-runnable row by without writing to it. Proved
        // on the row version rather than the column values, so an UPDATE rewriting the same values still fails.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "msg-1");

        var runnable = Assert.Single(
            Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r0")).WorkflowIds!
        );
        var parked = Assert.Single(
            Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r1")).WorkflowIds!
        );
        Assert.Equal(PersistentItemStatus.Held, await StatusOf(parked));

        var versionAtBirth = await RegistrationVersion(runnable);

        // The wake, which releases position 1 and must not look at position 0.
        await Deliver(repository, mailbox.Id, "msg-2");
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(parked));
        Assert.Equal(versionAtBirth, await RegistrationVersion(runnable));

        // The closure release takes every parked receiver the mailbox has — by then none, so it writes nothing.
        await repository.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(versionAtBirth, await RegistrationVersion(runnable));
    }

    [Fact]
    public async Task TheClosureRelease_PassesOverARunnableRegistrationToReachAParkedOne()
    {
        // The same guard under the arrangement that exercises it: a closure release with work to do, over a
        // table holding both kinds of row.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "msg-1");

        var runnable = Assert.Single(
            Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r0")).WorkflowIds!
        );
        var parked = Assert.Single(
            Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r1")).WorkflowIds!
        );

        var versionAtBirth = await RegistrationVersion(runnable);

        await repository.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Deadline,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(parked));

        await using var context = fixture.CreateDbContext();
        var released = await context.MailboxReceivers.SingleAsync(
            r => r.WorkflowId == parked,
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(released.ReleasedAt);

        Assert.Equal(versionAtBirth, await RegistrationVersion(runnable));
    }

    #endregion

    #region The three births

    [Fact]
    public async Task Enqueue_WhenADeliveryAlreadySitsAtItsPosition_IsBornRunnableAndAlreadyReleased()
    {
        // The early-delivery case is first-class: a message may arrive long before anyone is enqueued to read it.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "msg-1");

        var result = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)]));

        // Runnable at birth, because its truth is already frozen. It registers all the same: the position is the
        // address the executor reads its delivery by. Born released and never held, so no release will match it.
        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);
        var workflowId = Assert.Single(result.WorkflowIds!);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(workflowId));

        await using var context = fixture.CreateDbContext();
        var registration = await context.MailboxReceivers.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(mailbox.Id, registration.MailboxId);
        Assert.Equal(0L, registration.Seq);
        Assert.Equal(workflowId, registration.WorkflowId);
        Assert.Null(registration.HeldAt);
        Assert.NotNull(registration.ReleasedAt);
        Assert.Null(registration.ClaimedAt);

        Assert.Equal(1L, (await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken))!.NextSeq);
    }

    [Fact]
    public async Task Enqueue_AgainstAClosedMailboxWithNoDelivery_IsBornRunnableWithTheClosingSignal()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await repository.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var result = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)]));

        // Accepted, not refused: the receiver runs promptly and its handler concludes the exchange in the app's
        // own words. Refusing it would make the saga need a "mailbox was closed" branch it deliberately lacks.
        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);
        var workflowId = Assert.Single(result.WorkflowIds!);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(workflowId));

        // The closing-signal birth registers exactly as the delivered one does. What tells them apart is the
        // deliveries log, which the executor re-reads at every attempt, not anything recorded here.
        await using var context = fixture.CreateDbContext();
        var registration = await context.MailboxReceivers.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(0L, registration.Seq);
        Assert.Equal(workflowId, registration.WorkflowId);
        Assert.Null(registration.HeldAt);
        Assert.NotNull(registration.ReleasedAt);
    }

    [Fact]
    public async Task Enqueue_AgainstAClosedMailboxWithADeliveryAtItsPosition_StillGetsTheDelivery()
    {
        // The case that looks wrong and is not: an accepted delivery outranks closure, so a saga replaying after
        // the deadline drains the backlog it was promised.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "msg-1");
        await repository.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Deadline,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var result = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)]));

        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(Assert.Single(result.WorkflowIds!)));

        // The distinction is invisible in the status, so read the fact the executor will.
        await using var context = fixture.CreateDbContext();
        Assert.True(
            await context.MailboxDeliveries.AnyAsync(
                d => d.MailboxId == mailbox.Id && d.Idx == 0,
                TestContext.Current.CancellationToken
            )
        );
    }

    [Fact]
    public async Task Enqueue_AgainstAnOpenMailboxWithNoDelivery_IsBornHeldAndRegistersUnreleased()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var result = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)]));

        var workflowId = Assert.Single(result.WorkflowIds!);
        Assert.Equal(PersistentItemStatus.Held, await StatusOf(workflowId));

        await using var context = fixture.CreateDbContext();
        var registration = await context.MailboxReceivers.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(mailbox.Id, registration.MailboxId);
        Assert.Equal(0L, registration.Seq);
        Assert.Equal(workflowId, registration.WorkflowId);

        // The one row shape a release acts on: held, and not yet released.
        Assert.NotNull(registration.HeldAt);
        Assert.Null(registration.ReleasedAt);

        // A held row has no schedule and no lease: the release is transactional with its cause, so nothing here
        // is allowed to look like a timer.
        var row = await context.Workflows.SingleAsync(w => w.Id == workflowId, TestContext.Current.CancellationToken);
        Assert.Null(row.BackoffUntil);
        Assert.Null(row.StartAt);
        Assert.Null(row.LeaseToken);
        Assert.Null(row.HeartbeatAt);
        Assert.Equal(mailbox.Id, row.MailboxId);
    }

    [Fact]
    public async Task Enqueue_OrdinaryWorkflow_TouchesNoMailboxState()
    {
        // The non-mailbox hot path pays for one nullable column and nothing else — no lock, no registry row, no
        // counter. Worth pinning, because the flush now has a mailbox half that must stay dormant.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var result = Assert.Single(await Enqueue(repository, [Ordinary()]));

        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(Assert.Single(result.WorkflowIds!)));

        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.Equal(0L, afterwards!.NextSeq);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxReceivers.CountAsync(TestContext.Current.CancellationToken));
        Assert.Null(
            await context.Workflows.Select(w => w.MailboxId).SingleAsync(TestContext.Current.CancellationToken)
        );
    }

    #endregion

    #region Gapless positions

    [Fact]
    public async Task Enqueue_TwoReceiversInOneBatch_TakeConsecutivePositions()
    {
        // Positions fold sequentially within a flush: both receivers taking the position the batch started at
        // would double-book the rendezvous.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var result = Assert.Single(
            await Enqueue(repository, [Receiver(mailbox.Id, "first"), Receiver(mailbox.Id, "second")])
        );

        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);

        await using var context = fixture.CreateDbContext();
        var seqs = await context
            .MailboxReceivers.OrderBy(w => w.Seq)
            .Select(w => w.Seq)
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal([0L, 1L], seqs);
        Assert.Equal(2L, (await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken))!.NextSeq);
    }

    [Fact]
    public async Task Enqueue_ConcurrentReceivers_TakeAGaplessRunOfPositions()
    {
        // Whatever order the mailbox row lock grants, the positions handed out are 0..n-1 with no gap or repeat.
        const int Receivers = 12;
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var results = await Task.WhenAll(
            Enumerable
                .Range(0, Receivers)
                .Select(i => Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: $"receiver-{i}"))
        );

        Assert.All(results, r => Assert.Equal(BatchEnqueueResultStatus.Created, Assert.Single(r).Status));

        await using var context = fixture.CreateDbContext();
        var seqs = await context
            .MailboxReceivers.OrderBy(w => w.Seq)
            .Select(w => w.Seq)
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(Enumerable.Range(0, Receivers).Select(i => (long)i), seqs);

        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.Equal(Receivers, afterwards!.NextSeq);
    }

    [Fact]
    public async Task Enqueue_ReceiversForDifferentMailboxes_CountFromTheirOwnMailbox()
    {
        var repository = fixture.CreateRepository();
        var first = await MintMailbox(repository, "mailbox-a");
        var second = await MintMailbox(repository, "mailbox-b");

        await Enqueue(repository, [Receiver(first.Id, "a1"), Receiver(second.Id, "b1"), Receiver(first.Id, "a2")]);

        await using var context = fixture.CreateDbContext();
        var byMailbox = await context.MailboxReceivers.ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal([0L, 1L], byMailbox.Where(w => w.MailboxId == first.Id).Select(w => w.Seq).Order());
        Assert.Equal([0L], byMailbox.Where(w => w.MailboxId == second.Id).Select(w => w.Seq));
    }

    #endregion

    #region Refusals

    [Fact]
    public async Task Enqueue_AgainstAnUnknownMailbox_IsRefusedAndLeavesNoIdempotencyKey()
    {
        // A receiver for a mailbox the engine does not know is a workflow nothing could ever release. The key
        // release is what makes the refusal repeatable once the mailbox exists.
        var repository = fixture.CreateRepository();

        var result = Assert.Single(
            await Enqueue(repository, [Receiver(Guid.CreateVersion7())], idempotencyKey: "receiver-1")
        );

        Assert.Equal(BatchEnqueueResultStatus.MailboxNotFound, result.Status);
        Assert.Null(result.WorkflowIds);
        Assert.NotNull(result.ErrorMessage);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.Workflows.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(0, await context.IdempotencyKeys.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Enqueue_AgainstAMailboxInAnotherNamespace_IsRefused()
    {
        // The namespace is re-checked under the lock rather than trusted from the request, so a caller cannot
        // reach another tenant's mailbox by naming its id.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var result = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], ns: "some-other-ns"));

        Assert.Equal(BatchEnqueueResultStatus.MailboxNotFound, result.Status);
    }

    [Fact]
    public async Task Enqueue_MailboxIsReachableUnderAnyCasingOfItsNamespace()
    {
        // Namespaces are case-insensitive everywhere in the engine, so the repository layer normalizes on entry:
        // otherwise a mailbox minted through one spelling is invisible to a workflow enqueued through another.
        var repository = fixture.CreateRepository();
        var minted = Assert
            .IsType<MailboxMintResult.Minted>(
                await repository.MintMailbox(
                    Guid.CreateVersion7(),
                    "Receiver-NS",
                    "mailbox-key",
                    collectionKey: null,
                    TimeSpan.FromHours(1),
                    DateTimeOffset.UtcNow,
                    maxOpenPerCollection: 100,
                    TestContext.Current.CancellationToken
                )
            )
            .Mailbox;

        // Stored normalized, and readable back through a third spelling.
        Assert.Equal(Ns, minted.Namespace);
        Assert.NotNull(await repository.GetMailbox(minted.Id, "RECEIVER-ns", TestContext.Current.CancellationToken));

        var result = Assert.Single(await Enqueue(repository, [Receiver(minted.Id)], ns: "reCeiVer-nS"));

        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);
        Assert.Equal(PersistentItemStatus.Held, await StatusOf(Assert.Single(result.WorkflowIds!)));
    }

    [Fact]
    public async Task Enqueue_WhenASecondReceiverInOneRequestCrossesTheCap_ConsumesNoPositionsAtAll()
    {
        // A request carries one idempotency key, so the positions it would consume are held aside until every
        // receiver in it is known to be born. Leaving the first one's position behind would put a gap in the
        // receivers log that the wake's position match cannot survive.
        var repository = fixture.CreateRepository(SettingsWithLogLength(1));
        var mailbox = await MintMailbox(repository);

        var result = Assert.Single(
            await repository.BatchEnqueueWorkflows(
                [
                    Buffered(
                        new WorkflowRequestMetadata(Ns, "pair", null, DateTimeOffset.UtcNow, null),
                        [Receiver(mailbox.Id, "fits"), Receiver(mailbox.Id, "does-not")]
                    ),
                ],
                TestContext.Current.CancellationToken
            )
        );

        Assert.Equal(BatchEnqueueResultStatus.MailboxLogFull, result.Status);

        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.Equal(0L, afterwards!.NextSeq);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxReceivers.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(0, await context.Workflows.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(0, await context.IdempotencyKeys.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Enqueue_RefusalRefusesTheWholeRequest_IncludingItsOrdinaryWorkflows()
    {
        // An ordinary workflow batched beside a doomed receiver goes down with it rather than being created
        // under a key that reports a refusal.
        var repository = fixture.CreateRepository();

        var result = Assert.Single(
            await Enqueue(repository, [Ordinary("plain"), Receiver(Guid.CreateVersion7(), "doomed")])
        );

        Assert.Equal(BatchEnqueueResultStatus.MailboxNotFound, result.Status);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.Workflows.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Enqueue_RefusedRequest_DoesNotTakeTheRestOfTheBatchDownWithIt()
    {
        // Per-request isolation inside one flush: the refusal is a verdict about one caller's request, not a
        // transaction failure.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var metadata = new WorkflowRequestMetadata(Ns, string.Empty, null, DateTimeOffset.UtcNow, null);
        var doomed = Buffered(metadata with { IdempotencyKey = "doomed" }, [Receiver(Guid.CreateVersion7())]);
        var ordinary = Buffered(metadata with { IdempotencyKey = "ordinary" }, [Ordinary()]);
        var receiver = Buffered(metadata with { IdempotencyKey = "receiver" }, [Receiver(mailbox.Id)]);

        var results = await repository.BatchEnqueueWorkflows(
            [doomed, ordinary, receiver],
            TestContext.Current.CancellationToken
        );

        Assert.Equal(BatchEnqueueResultStatus.MailboxNotFound, results[0].Status);
        Assert.Equal(BatchEnqueueResultStatus.Created, results[1].Status);
        Assert.Equal(BatchEnqueueResultStatus.Created, results[2].Status);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(2, await context.Workflows.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(2, await context.IdempotencyKeys.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Enqueue_WhenTheReceiversLogIsFull_IsRefused()
    {
        // The same number bounds both logs: they are views of one exchange, and a receiver costs as much as a
        // message.
        var repository = fixture.CreateRepository(SettingsWithLogLength(2));
        var mailbox = await MintMailbox(repository);

        await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r0");
        await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r1");

        var refused = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r2"));

        Assert.Equal(BatchEnqueueResultStatus.MailboxLogFull, refused.Status);
        Assert.Equal(2L, (await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken))!.NextSeq);
    }

    [Fact]
    public async Task Enqueue_ReplayedKeyOnAFullReceiversLog_StillReplaysTheReceiver()
    {
        // The accepted-versus-kept rule on the enqueue path: the request that filled the log is exactly the one
        // a crashed saga replays, and answering it with the refusal would strand a relay at its last hop.
        var repository = fixture.CreateRepository(SettingsWithLogLength(1));
        var mailbox = await MintMailbox(repository);

        var created = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r0"));
        Assert.Equal(BatchEnqueueResultStatus.Created, created.Status);

        var replay = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r0"));

        Assert.Equal(BatchEnqueueResultStatus.Duplicate, replay.Status);
        Assert.Equal(created.WorkflowIds, replay.WorkflowIds);
        Assert.Equal(1L, (await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken))!.NextSeq);
    }

    [Fact]
    public async Task Enqueue_IntraBatchDuplicateOfARefusedRequest_InheritsItsVerdict()
    {
        // A duplicate normally classifies against the stored idempotency key, which a refusal has just released.
        // Without the pairing this would find nothing to classify against and throw rather than answer.
        var repository = fixture.CreateRepository();
        var metadata = new WorkflowRequestMetadata(Ns, "same-key", null, DateTimeOffset.UtcNow, null);
        var missing = Guid.CreateVersion7();

        var results = await repository.BatchEnqueueWorkflows(
            [Buffered(metadata, [Receiver(missing)]), Buffered(metadata, [Receiver(missing)])],
            TestContext.Current.CancellationToken
        );

        Assert.All(results, r => Assert.Equal(BatchEnqueueResultStatus.MailboxNotFound, r.Status));
    }

    #endregion

    #region The mailbox row is the serialization point

    [Fact]
    public async Task Enqueue_LocksOnlyForRequestsThatCanConsumeAPosition()
    {
        // The flush locks a mailbox for requests that are actually new, and only those: a replay's verdict comes
        // from engine.idempotency_keys alone and it consumes no position, so making it wait would stall every
        // unrelated caller in the flush; a genuinely new receiver must decide against a stable snapshot.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var created = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r0"));

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var blockingTx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);
        await using (
            var lockCmd = new NpgsqlCommand(
                "SELECT id FROM engine.mailboxes WHERE id = @id FOR UPDATE",
                blocker,
                blockingTx
            )
        )
        {
            lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));
            await lockCmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        // The replay: answered while the lock is held.
        var replay = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r0"));
        Assert.Equal(BatchEnqueueResultStatus.Duplicate, replay.Status);
        Assert.Equal(created.WorkflowIds, replay.WorkflowIds);

        // The new receiver: cannot be.
        var fresh = Enqueue(repository, [Receiver(mailbox.Id)], idempotencyKey: "r1");
        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(
            fresh.IsCompleted,
            "A new receiver's birth was decided while the mailbox row lock was held elsewhere."
        );

        await blockingTx.RollbackAsync(TestContext.Current.CancellationToken);

        var result = Assert.Single(await fresh);
        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);
        Assert.Equal(PersistentItemStatus.Held, await StatusOf(Assert.Single(result.WorkflowIds!)));
    }

    [Fact]
    public async Task Enqueue_OfOrdinaryWorkflows_IsUnaffectedByALockedMailbox()
    {
        // The same property from the other side: the write buffer batches unrelated callers into one flush, so a
        // mailbox held by a delivery or a close must not stall workflows that have nothing to do with it.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var blockingTx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);
        await using (
            var lockCmd = new NpgsqlCommand(
                "SELECT id FROM engine.mailboxes WHERE id = @id FOR UPDATE",
                blocker,
                blockingTx
            )
        )
        {
            lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));
            await lockCmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        var result = Assert.Single(await Enqueue(repository, [Ordinary()]));

        Assert.Equal(BatchEnqueueResultStatus.Created, result.Status);

        await blockingTx.RollbackAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Enqueue_DeliveryFirst_BornRunnableWithTheDelivery()
    {
        // Interleaving one of exactly two. The delivery holds the mailbox row lock, so once it commits the
        // receiver's position is behind next_idx and it is born runnable with a message.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var deliveryTx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);

        // Stands in for the delivery's own transaction: lock first, then append at position 0.
        await using (
            var deliveryCmd = new NpgsqlCommand(
                """
                WITH locked AS (
                    SELECT id FROM engine.mailboxes WHERE id = @id FOR UPDATE
                ),
                bumped AS (
                    UPDATE engine.mailboxes SET next_idx = next_idx + 1
                    WHERE id = (SELECT id FROM locked)
                    RETURNING next_idx - 1 AS idx
                )
                INSERT INTO engine.mailbox_deliveries (mailbox_id, idx, idempotency_key, payload, accepted_at)
                SELECT @id, bumped.idx, 'msg-1', '{}', now() FROM bumped
                """,
                blocker,
                deliveryTx
            )
        )
        {
            deliveryCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));
            await deliveryCmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        var enqueue = Enqueue(repository, [Receiver(mailbox.Id)]);
        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(enqueue.IsCompleted, "The enqueue decided a receiver's birth while the delivery held the lock.");

        await deliveryTx.CommitAsync(TestContext.Current.CancellationToken);

        var workflowId = Assert.Single(Assert.Single(await enqueue).WorkflowIds!);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(workflowId));

        // Registered at its position and released at birth, so the wake that follows has nothing to do.
        await using var context = fixture.CreateDbContext();
        var registration = await context.MailboxReceivers.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(0L, registration.Seq);
        Assert.Null(registration.HeldAt);
        Assert.NotNull(registration.ReleasedAt);
    }

    [Fact]
    public async Task Enqueue_EnqueueFirst_LeavesAHeldRegistrationForTheDeliveryToFind()
    {
        // Interleaving two, and there is no third: the receiver takes the lock first, so a delivery for that
        // position can only reach the mailbox after this transaction commits, and therefore always finds it.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var result = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)]));
        var workflowId = Assert.Single(result.WorkflowIds!);

        await Deliver(repository, mailbox.Id, "msg-1");

        await using var context = fixture.CreateDbContext();
        var registration = await context.MailboxReceivers.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(0L, registration.Seq);
        Assert.Equal(workflowId, registration.WorkflowId);
        Assert.NotNull(registration.HeldAt);

        // The rendezvous itself lives in MailboxRendezvousTests — asserted here only far enough to show that the
        // row this step registers is the thing the wake consumes.
        Assert.NotNull(registration.ReleasedAt);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(workflowId));
    }

    [Fact]
    public async Task Enqueue_RacingAClose_IsSerializedByTheMailboxRowLock()
    {
        // Closure versus receiver birth: the close holds the row lock, so the enqueue waits and then reads a
        // closed mailbox. Never parked on a closed mailbox, which would be a receiver nothing could release.
        // The symmetric interleaving is step 4's, where closure gains a release half to act with.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var closingTx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);
        await using (
            var closeCmd = new NpgsqlCommand(
                """
                UPDATE engine.mailboxes
                SET status = 'disposed', disposed_reason = 'request', disposed_at = now()
                WHERE id = @id
                """,
                blocker,
                closingTx
            )
        )
        {
            closeCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));
            await closeCmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        var enqueue = Enqueue(repository, [Receiver(mailbox.Id)]);
        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(enqueue.IsCompleted, "The enqueue decided a receiver's birth while the close held the lock.");

        await closingTx.CommitAsync(TestContext.Current.CancellationToken);

        var workflowId = Assert.Single(Assert.Single(await enqueue).WorkflowIds!);
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(workflowId));

        // Released at birth rather than held: the closure release already ran under the lock this enqueue was
        // waiting on.
        await using var context = fixture.CreateDbContext();
        var registration = await context.MailboxReceivers.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Null(registration.HeldAt);
        Assert.NotNull(registration.ReleasedAt);
    }

    #endregion

    #region Held is unfetchable

    [Fact]
    public async Task FetchAndLock_NeverClaimsAHeldReceiver()
    {
        // The status's whole meaning, against the real gate: a held receiver has not started and no worker may
        // start it, or it would run before its delivery existed.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Enqueue(repository, [Receiver(mailbox.Id), Ordinary()]);

        var fetched = await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken);

        var operationId = Assert.Single(fetched).OperationId;
        Assert.Equal("ordinary", operationId);
    }

    [Fact]
    public async Task CountRunnableWorkflows_ExcludesHeldReceivers()
    {
        // The harness waits for this to reach zero before truncating, so counting a held receiver as runnable
        // would turn that into a wait that never ends.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Enqueue(repository, [Receiver(mailbox.Id)]);

        Assert.Equal(0, await repository.CountRunnableWorkflows(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task RequestCancellation_OnAHeldReceiver_IsAcceptedAndTakesEffectWhenItIsReleased()
    {
        // A deliberate choice: cancellation is accepted on a held receiver even though nothing acts on it while
        // it stays held. Cancel-then-close is the design's hard stop, so refusing the cancel would take the
        // ops recipe away.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var result = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)]));
        var workflowId = Assert.Single(result.WorkflowIds!);

        var accepted = await repository.RequestCancellation(
            workflowId,
            Ns,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        Assert.True(accepted);

        await using var context = fixture.CreateDbContext();
        var row = await context.Workflows.SingleAsync(w => w.Id == workflowId, TestContext.Current.CancellationToken);
        Assert.NotNull(row.CancellationRequestedAt);

        // A pending cancellation bypasses the timer gate, never the status list, so the flag cannot pull a held
        // receiver into a worker before its truth is frozen.
        Assert.Equal(PersistentItemStatus.Held, row.Status);
        Assert.Empty(await repository.FetchAndLockWorkflows(count: 10, TestContext.Current.CancellationToken));
    }

    #endregion

    #region Schema

    [Fact]
    public async Task RegistryPositions_AreUniquePerMailbox()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Enqueue(repository, [Receiver(mailbox.Id)]);

        var duplicate = await Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await using var conn = new NpgsqlConnection(fixture.ConnectionString);
            await conn.OpenAsync(TestContext.Current.CancellationToken);
            await using var cmd = new NpgsqlCommand(
                """
                INSERT INTO engine.mailbox_receivers (mailbox_id, seq, workflow_id, held_at, released_at)
                VALUES (@id, 0, gen_random_uuid(), now(), NULL)
                """,
                conn
            );
            cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));
            await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        });

        Assert.Equal(PostgresErrorCodes.UniqueViolation, duplicate.SqlState);
    }

    [Fact]
    public async Task AWorkflowCanWaitAtOnlyOnePosition()
    {
        // The executor reads a receiver's position by workflow id and expects exactly one answer.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var result = Assert.Single(await Enqueue(repository, [Receiver(mailbox.Id)]));
        var workflowId = Assert.Single(result.WorkflowIds!);

        var duplicate = await Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await using var conn = new NpgsqlConnection(fixture.ConnectionString);
            await conn.OpenAsync(TestContext.Current.CancellationToken);
            await using var cmd = new NpgsqlCommand(
                """
                INSERT INTO engine.mailbox_receivers (mailbox_id, seq, workflow_id, held_at, released_at)
                VALUES (@id, 99, @workflowId, now(), NULL)
                """,
                conn
            );
            cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));
            cmd.Parameters.Add(new NpgsqlParameter<Guid>("workflowId", workflowId));
            await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        });

        Assert.Equal(PostgresErrorCodes.UniqueViolation, duplicate.SqlState);
    }

    [Fact]
    public async Task AMailboxWithRegistrationsCannotBeDeleted()
    {
        // The same non-cascading foreign key mailbox_deliveries carries: retention purges children first, and an
        // accidental delete should fail loudly rather than silently take the rendezvous with it.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Enqueue(repository, [Receiver(mailbox.Id)]);

        var violation = await Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await using var conn = new NpgsqlConnection(fixture.ConnectionString);
            await conn.OpenAsync(TestContext.Current.CancellationToken);
            await using var cmd = new NpgsqlCommand("DELETE FROM engine.mailboxes WHERE id = @id", conn);
            cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));
            await cmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        });

        // 23001 restrict_violation rather than 23503: the constraint is RESTRICT, so the delete is refused
        // outright instead of reported as a dangling reference.
        Assert.Equal(PostgresErrorCodes.RestrictViolation, violation.SqlState);
    }

    #endregion

    /// <summary>
    /// A settings instance whose only interesting value is the log cap. Built here rather than mutated on the
    /// fixture's shared instance, which every other test in the collection reads.
    /// </summary>
    private static IOptions<EngineSettings> SettingsWithLogLength(int maxMailboxLogLength) =>
        Options.Create(
            new EngineSettings
            {
                MaxWorkflowsPerRequest = 100,
                MaxStepsPerWorkflow = 50,
                MaxLabels = 50,
                MetricsCollectionInterval = TimeSpan.FromSeconds(5),
                DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
                MaxStepCommandTimeout = TimeSpan.FromHours(2),
                DefaultStepRetryStrategy = RetryStrategy.None(),
                DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
                DatabaseRetryStrategy = RetryStrategy.None(),
                HeartbeatInterval = TimeSpan.FromSeconds(3),
                StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
                MaxReclaimCount = 3,
                MaxMailboxLogLength = maxMailboxLogLength,
            }
        );

    /// <summary>
    /// One buffered request. The body hash is derived from the idempotency key rather than randomized, because
    /// these tests replay requests and a random hash would make every replay a body conflict.
    /// </summary>
    private static BufferedEnqueueRequest Buffered(
        WorkflowRequestMetadata metadata,
        IReadOnlyList<WorkflowRequest> workflows
    ) =>
        new(
            new WorkflowEnqueueRequest { Workflows = workflows },
            metadata,
            SHA256.HashData(Encoding.UTF8.GetBytes(metadata.IdempotencyKey)),
            new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously)
        );
}
