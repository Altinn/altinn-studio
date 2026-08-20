using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers the two reads that exist only to be watched: the dashboard's per-collection mailbox read, and the
/// count behind the gauge that alerts on a mailbox the deadline sweep never closed. Neither is consulted by any
/// engine decision, so what these tests are for is that the picture they paint is the one the rows hold.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MailboxDashboardTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "dashboard-ns";
    private const string Collection = "collection-a";

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static async Task<MailboxResponse> MintMailbox(
        EngineRepository repository,
        string key = "mailbox-key",
        string? collectionKey = Collection,
        string ns = Ns,
        TimeSpan? timeout = null,
        DateTimeOffset? now = null
    ) =>
        Assert
            .IsType<MailboxMintResult.Minted>(
                await repository.MintMailbox(
                    Guid.CreateVersion7(),
                    ns,
                    key,
                    collectionKey,
                    timeout ?? TimeSpan.FromHours(1),
                    now ?? DateTimeOffset.UtcNow,
                    maxOpenPerCollection: 100,
                    TestContext.Current.CancellationToken
                )
            )
            .Mailbox;

    private static async Task<long> Deliver(EngineRepository repository, Guid mailboxId, string key, string ns = Ns) =>
        Assert
            .IsType<MailboxDeliveryResult.Accepted>(
                await repository.DeliverToMailbox(
                    mailboxId,
                    ns,
                    key,
                    payload: "{}",
                    DateTimeOffset.UtcNow,
                    maxLogLength: 100,
                    TestContext.Current.CancellationToken
                )
            )
            .Delivery.Idx;

    private static WorkflowRequest Receiver(Guid mailboxId) =>
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

    private static async Task<Guid> EnqueueReceiver(EngineRepository repository, Guid mailboxId, string ns = Ns)
    {
        var metadata = new WorkflowRequestMetadata(ns, Guid.NewGuid().ToString("N"), null, DateTimeOffset.UtcNow, null);
        var results = await repository.BatchEnqueueWorkflows(
            [Buffered(metadata, [Receiver(mailboxId)])],
            TestContext.Current.CancellationToken
        );
        return Assert.Single(Assert.Single(results).WorkflowIds!);
    }

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

    private static Task<MailboxCollectionPage> ReadPage(
        EngineRepository repository,
        string? ns = Ns,
        string[]? keys = null,
        int limitPerCollection = 50
    ) =>
        repository.GetMailboxesForCollections(
            ns,
            keys ?? [Collection],
            limitPerCollection,
            TestContext.Current.CancellationToken
        );

    private static async Task<IReadOnlyList<MailboxSnapshot>> Read(
        EngineRepository repository,
        string? ns = Ns,
        string[]? keys = null,
        int limitPerCollection = 50
    ) => (await ReadPage(repository, ns, keys, limitPerCollection)).Mailboxes;

    #region The log, position by position

    [Fact]
    public async Task AMintedMailbox_ReadsBackWithItsCountersAndNoPositions()
    {
        // The state the mailbox spends the whole outbound leg in: minted so its id can go out as a reply address,
        // with nothing in either log. It has to read back as a mailbox with an empty log rather than not at all.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var snapshot = Assert.Single(await Read(repository));

        Assert.Equal(mailbox.Id, snapshot.Mailbox.Id);
        Assert.Equal(Collection, snapshot.Mailbox.CollectionKey);
        Assert.Equal(MailboxStatus.Open, snapshot.Mailbox.Status);
        Assert.Equal(0, snapshot.Mailbox.NextIdx);
        Assert.Equal(0, snapshot.Mailbox.NextSeq);
        Assert.Empty(snapshot.Positions);
    }

    [Fact]
    public async Task ADeliveryWithNoReceiver_ReadsAsAPositionHoldingOnlyTheMessage()
    {
        // An accepted delivery nobody has been enqueued for — the unconsumed case, whose count the mailbox
        // reports but whose positions only this read can name.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "source-msg-1");

        var position = Assert.Single(Assert.Single(await Read(repository)).Positions);

        Assert.Equal(0, position.Position);
        Assert.Equal("source-msg-1", position.DeliveryIdempotencyKey);
        Assert.NotNull(position.AcceptedAt);
        Assert.Null(position.ReceiverWorkflowId);
        Assert.Null(position.HeldAt);
        Assert.Null(position.ReleasedAt);
    }

    [Fact]
    public async Task AParkedReceiver_ReadsAsAPositionHoldingOnlyTheReceiver()
    {
        // The mirror image, and the position an operator looks for when an exchange has stalled.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        var position = Assert.Single(Assert.Single(await Read(repository)).Positions);

        Assert.Equal(0, position.Position);
        Assert.Null(position.DeliveryIdempotencyKey);
        Assert.Null(position.AcceptedAt);
        Assert.Equal(receiver, position.ReceiverWorkflowId);
        Assert.NotNull(position.HeldAt);
        Assert.Null(position.ReleasedAt);
    }

    [Fact]
    public async Task AWokenReceiver_ReadsWithBothSidesAndAParkDurationTheStampsSpan()
    {
        // Both halves of the rendezvous at one position, and the pair of stamps that make the park duration a
        // real interval. held_at is load-bearing: after the receiver settles nothing else distinguishes it.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "source-msg-1");

        var position = Assert.Single(Assert.Single(await Read(repository)).Positions);

        Assert.Equal("source-msg-1", position.DeliveryIdempotencyKey);
        Assert.Equal(receiver, position.ReceiverWorkflowId);
        Assert.NotNull(position.HeldAt);
        Assert.NotNull(position.ReleasedAt);
        Assert.True(position.ReleasedAt >= position.HeldAt);
    }

    [Fact]
    public async Task AReceiverBornRunnable_ReadsWithNoHeldStamp()
    {
        // The distinction held_at exists for, and the one the workflow's status cannot make: this receiver ran
        // straight away because its message was already there.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "source-msg-1");
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        var position = Assert.Single(Assert.Single(await Read(repository)).Positions);

        Assert.Equal(receiver, position.ReceiverWorkflowId);
        Assert.Null(position.HeldAt);
        Assert.NotNull(position.ReleasedAt);
    }

    [Fact]
    public async Task AReceiverTheClosureReleased_KeepsItsHeldStampAndHasNoMessage()
    {
        // How a timed-out exchange ends, position by position. Both stamps set and no delivery present is the
        // only combination that says "gave up" rather than "still waiting" or "was answered".
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await repository.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Deadline,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var snapshot = Assert.Single(await Read(repository));
        Assert.Equal(MailboxStatus.Disposed, snapshot.Mailbox.Status);
        Assert.Equal(MailboxDisposedReason.Deadline, snapshot.Mailbox.DisposedReason);

        var position = Assert.Single(snapshot.Positions);
        Assert.Equal(receiver, position.ReceiverWorkflowId);
        Assert.Null(position.DeliveryIdempotencyKey);
        Assert.NotNull(position.HeldAt);
        Assert.NotNull(position.ReleasedAt);
    }

    [Fact]
    public async Task EveryPositionCarriesAMessageOrAReceiver_AcrossEveryStateTheRendezvousProduces()
    {
        // The invariant the mapper's state derivation leans on instead of defending: the read builds its
        // positions from the rows of the two logs, so a position with neither is not something it can return.
        // It takes two mailboxes, which is a fact about the design: the two logs share one gapless position
        // space, so an unconsumed delivery needs next_idx > next_seq while a parked receiver needs the reverse.
        var repository = fixture.CreateRepository();
        var ahead = await MintMailbox(repository, "deliveries-ahead");
        var behind = await MintMailbox(repository, "deliveries-behind");

        // 0: consumed after parking. 1: consumed, born runnable. 2: a message nobody was enqueued for.
        await EnqueueReceiver(repository, ahead.Id);
        await Deliver(repository, ahead.Id, "msg-0");
        await Deliver(repository, ahead.Id, "msg-1");
        await EnqueueReceiver(repository, ahead.Id);
        await Deliver(repository, ahead.Id, "msg-2");

        // 0: a receiver still parked, with nothing at its position.
        await EnqueueReceiver(repository, behind.Id);

        var snapshots = await Read(repository);
        Assert.Equal(2, snapshots.Count);
        Assert.All(
            snapshots.SelectMany(s => s.Positions),
            p => Assert.True(p.DeliveryIdempotencyKey is not null || p.ReceiverWorkflowId is not null)
        );

        // And the four positions really are the four distinct shapes, not four of one shape.
        var aheadPositions = snapshots.Single(s => s.Mailbox.Id == ahead.Id).Positions;
        Assert.Equal([0L, 1L, 2L], aheadPositions.Select(p => p.Position));
        Assert.NotNull(aheadPositions[0].DeliveryIdempotencyKey);
        Assert.NotNull(aheadPositions[0].ReceiverWorkflowId);
        Assert.NotNull(aheadPositions[0].HeldAt);
        Assert.NotNull(aheadPositions[1].DeliveryIdempotencyKey);
        Assert.NotNull(aheadPositions[1].ReceiverWorkflowId);
        Assert.Null(aheadPositions[1].HeldAt);
        Assert.NotNull(aheadPositions[2].DeliveryIdempotencyKey);
        Assert.Null(aheadPositions[2].ReceiverWorkflowId);

        var behindPosition = Assert.Single(snapshots.Single(s => s.Mailbox.Id == behind.Id).Positions);
        Assert.Null(behindPosition.DeliveryIdempotencyKey);
        Assert.NotNull(behindPosition.ReceiverWorkflowId);
        Assert.NotNull(behindPosition.HeldAt);
        Assert.Null(behindPosition.ReleasedAt);
    }

    [Fact]
    public async Task PositionsComeFromTheRows_SoALogThatDisagreesWithItsCounterShowsTheRows()
    {
        // What separates this read from one built on GREATEST(next_idx, next_seq): while both logs are gapless
        // the two answer identically, so the disagreement is forced by hand — a delivery row removed under a
        // counter that still claims it. A counter-driven read would answer three positions rather than two.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Deliver(repository, mailbox.Id, "msg-0");
        await Deliver(repository, mailbox.Id, "msg-1");
        await Deliver(repository, mailbox.Id, "msg-2");

        await using var context = fixture.CreateDbContext();
        await context.Database.ExecuteSqlAsync(
            $"DELETE FROM engine.mailbox_deliveries WHERE mailbox_id = {mailbox.Id} AND idx = 2",
            TestContext.Current.CancellationToken
        );

        var snapshot = Assert.Single(await Read(repository));

        Assert.Equal(3, snapshot.Mailbox.NextIdx);
        Assert.Equal([0L, 1L], snapshot.Positions.Select(p => p.Position));
    }

    [Fact]
    public async Task PositionsArriveInLogOrder_AndMailboxesNewestFirst()
    {
        // The reader folds rows into snapshots by adjacency, which only holds if the query orders by mailbox and
        // then by position. The assertion is on the whole sequence, so an interleave fails it.
        var repository = fixture.CreateRepository();
        var older = await MintMailbox(repository, "older", now: DateTimeOffset.UtcNow.AddMinutes(-5));
        var newer = await MintMailbox(repository, "newer");
        for (var i = 0; i < 10; i++)
        {
            await Deliver(repository, older.Id, $"older-{i}");
            await Deliver(repository, newer.Id, $"newer-{i}");
        }

        var snapshots = await Read(repository);

        Assert.Equal([newer.Id, older.Id], snapshots.Select(s => s.Mailbox.Id));
        Assert.All(
            snapshots,
            s => Assert.Equal(Enumerable.Range(0, 10).Select(i => (long)i), s.Positions.Select(p => p.Position))
        );
    }

    #endregion

    #region What the read is scoped to

    [Fact]
    public async Task OnlyTheNamedCollectionsAreRead_AndAMailboxWithNoCollectionKeyIsNeverAmongThem()
    {
        // The scope is the caller's collection keys. A mailbox minted without one has no group to render under
        // and must not arrive as a stray: `collection_key = ANY(...)` is null-safe by construction.
        var repository = fixture.CreateRepository();
        var wanted = await MintMailbox(repository, "wanted", Collection);
        await MintMailbox(repository, "other-collection", "collection-b");
        await MintMailbox(repository, "no-collection", collectionKey: null);

        Assert.Equal(wanted.Id, Assert.Single(await Read(repository)).Mailbox.Id);

        var both = await Read(repository, keys: [Collection, "collection-b"]);
        Assert.Equal(2, both.Count);
    }

    [Fact]
    public async Task TheNamespaceFilterApplies_AndANullNamespaceReadsEveryOne()
    {
        // Two namespaces can hold the same collection key, so the filter has to bind. A null namespace is the
        // dashboard's unfiltered view.
        var repository = fixture.CreateRepository();
        var mine = await MintMailbox(repository, "mine", Collection, Ns);
        var theirs = await MintMailbox(repository, "theirs", Collection, "other-ns");

        Assert.Equal(mine.Id, Assert.Single(await Read(repository)).Mailbox.Id);
        Assert.Equal(theirs.Id, Assert.Single(await Read(repository, ns: "other-ns")).Mailbox.Id);
        Assert.Equal(2, (await Read(repository, ns: null)).Count);
    }

    [Fact]
    public async Task TheLimitTakesTheMostRecentlyMinted_AndAnEmptyKeySetReadsNothingAtAll()
    {
        // The limit takes newest first because a collection's current exchange is the one being watched. An empty
        // key set is answered without a query at all.
        var repository = fixture.CreateRepository();
        var now = DateTimeOffset.UtcNow;
        var oldest = await MintMailbox(repository, "m0", now: now.AddMinutes(-3));
        var middle = await MintMailbox(repository, "m1", now: now.AddMinutes(-2));
        var newest = await MintMailbox(repository, "m2", now: now.AddMinutes(-1));

        var limited = await Read(repository, limitPerCollection: 2);
        Assert.Equal([newest.Id, middle.Id], limited.Select(s => s.Mailbox.Id));
        Assert.DoesNotContain(oldest.Id, limited.Select(s => s.Mailbox.Id));

        Assert.Empty(await Read(repository, keys: []));
        Assert.Empty(await Read(repository, limitPerCollection: 0));
    }

    [Fact]
    public async Task TheLimitIsPerCollection_SoOneBusyCollectionCannotStarveAnother()
    {
        // The property a global limit cannot have: ordered newest-first across every requested key, a global
        // limit of 2 here would return the busy collection's two newest and nothing for the quiet one — and a
        // group with no mailbox on a card is indistinguishable from an exchange that never had one.
        var repository = fixture.CreateRepository();
        var now = DateTimeOffset.UtcNow;
        var quiet = await MintMailbox(repository, "quiet-0", "collection-quiet", now: now.AddMinutes(-30));
        await MintMailbox(repository, "busy-0", "collection-busy", now: now.AddMinutes(-3));
        var busyNewer = await MintMailbox(repository, "busy-1", "collection-busy", now: now.AddMinutes(-2));
        var busyNewest = await MintMailbox(repository, "busy-2", "collection-busy", now: now.AddMinutes(-1));

        var page = await ReadPage(repository, keys: ["collection-busy", "collection-quiet"], limitPerCollection: 2);

        Assert.Equal([busyNewest.Id, busyNewer.Id, quiet.Id], page.Mailboxes.Select(s => s.Mailbox.Id));

        // And the busy collection is named as truncated while the quiet one is not, which is what lets a card say
        // "older mailboxes not shown" over the right group and nowhere else.
        Assert.Equal(["collection-busy"], page.TruncatedCollections);
    }

    [Fact]
    public async Task AFullWindowIsNotReportedAsTruncated_AndTheOverflowRowNeverReachesTheCaller()
    {
        // The boundary the extra fetched row exists to find: exactly at the limit is a whole window, one past it
        // is cut, and the extra row is dropped rather than returned.
        var repository = fixture.CreateRepository();
        var now = DateTimeOffset.UtcNow;
        await MintMailbox(repository, "m0", now: now.AddMinutes(-2));
        await MintMailbox(repository, "m1", now: now.AddMinutes(-1));

        var exactlyFull = await ReadPage(repository, limitPerCollection: 2);
        Assert.Equal(2, exactlyFull.Mailboxes.Count);
        Assert.Empty(exactlyFull.TruncatedCollections);

        var cut = await ReadPage(repository, limitPerCollection: 1);
        Assert.Single(cut.Mailboxes);
        Assert.Equal([Collection], cut.TruncatedCollections);
    }

    [Fact]
    public async Task TruncatedCollectionsFollowTheCallersKeyOrder_NotTheOrderTheRowsArrivedIn()
    {
        // With one truncated collection any order looks right, so this arranges two and asks in both orders.
        // Arrival order follows the global newest-first sort and would answer the same way twice.
        var repository = fixture.CreateRepository();
        var now = DateTimeOffset.UtcNow;
        await MintMailbox(repository, "a-old", "collection-a", now: now.AddMinutes(-40));
        await MintMailbox(repository, "a-new", "collection-a", now: now.AddMinutes(-1));
        await MintMailbox(repository, "b-old", "collection-b", now: now.AddMinutes(-30));
        await MintMailbox(repository, "b-new", "collection-b", now: now.AddMinutes(-2));

        var forwards = await ReadPage(repository, keys: ["collection-a", "collection-b"], limitPerCollection: 1);
        Assert.Equal(["collection-a", "collection-b"], forwards.TruncatedCollections);

        var backwards = await ReadPage(repository, keys: ["collection-b", "collection-a"], limitPerCollection: 1);
        Assert.Equal(["collection-b", "collection-a"], backwards.TruncatedCollections);
    }

    #endregion

    #region The overdue gauge's count

    [Fact]
    public async Task OverdueCount_IsTheSweepsOwnPredicateAtACallerChosenInstant()
    {
        // The gauge's whole value is being zero on a healthy engine, so what it must not count is a mailbox whose
        // deadline has merely passed — the sweep has a cadence to reach that one. Both sides of the cutoff are
        // exercised against one mailbox.
        var repository = fixture.CreateRepository();
        var mintedAt = DateTimeOffset.UtcNow;
        await MintMailbox(repository, "overdue", timeout: TimeSpan.FromMinutes(10), now: mintedAt);
        var deadline = mintedAt.AddMinutes(10);

        Assert.Equal(
            0,
            await repository.CountOverdueOpenMailboxes(
                deadline.AddMinutes(-1),
                limit: 100,
                TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(
            1,
            await repository.CountOverdueOpenMailboxes(deadline, limit: 100, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task OverdueCount_IgnoresAClosedMailboxHoweverLongPastItsDeadlineItIs()
    {
        // The half that makes the gauge an invariant alarm rather than a backlog reading: closing is what the
        // sweep does, so counting a closed mailbox would leave the gauge permanently non-zero.
        var repository = fixture.CreateRepository();
        var mintedAt = DateTimeOffset.UtcNow.AddHours(-2);
        var mailbox = await MintMailbox(repository, "closed", timeout: TimeSpan.FromMinutes(1), now: mintedAt);
        var later = DateTimeOffset.UtcNow;

        Assert.Equal(
            1,
            await repository.CountOverdueOpenMailboxes(later, limit: 100, TestContext.Current.CancellationToken)
        );

        await repository.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Deadline,
            later,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(
            0,
            await repository.CountOverdueOpenMailboxes(later, limit: 100, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task OverdueCount_CountsAcrossEveryNamespace()
    {
        // Deliberately unscoped: the gauge is one number per engine instance, and an invariant violation in a
        // namespace nobody is looking at is the one most worth alerting on.
        var repository = fixture.CreateRepository();
        var mintedAt = DateTimeOffset.UtcNow.AddHours(-1);
        await MintMailbox(repository, "a", Collection, Ns, TimeSpan.FromMinutes(1), mintedAt);
        await MintMailbox(repository, "b", Collection, "other-ns", TimeSpan.FromMinutes(1), mintedAt);

        Assert.Equal(
            2,
            await repository.CountOverdueOpenMailboxes(
                DateTimeOffset.UtcNow,
                limit: 100,
                TestContext.Current.CancellationToken
            )
        );
    }

    [Fact]
    public async Task OverdueCount_SaturatesAtItsLimitRatherThanCountingTheWholeBacklog()
    {
        // The bound the gauge trades exactness for. It runs on the metrics cadence, and the event it reports is a
        // mass timeout — precisely when an unbounded count would visit every overdue row on every tick.
        var repository = fixture.CreateRepository();
        var mintedAt = DateTimeOffset.UtcNow.AddHours(-1);
        for (var i = 0; i < 3; i++)
            await MintMailbox(repository, $"overdue-{i}", timeout: TimeSpan.FromMinutes(1), now: mintedAt);

        var now = DateTimeOffset.UtcNow;
        Assert.Equal(
            3,
            await repository.CountOverdueOpenMailboxes(now, limit: 100, TestContext.Current.CancellationToken)
        );
        Assert.Equal(
            2,
            await repository.CountOverdueOpenMailboxes(now, limit: 2, TestContext.Current.CancellationToken)
        );

        // A zero cap answers zero, which is the guard clause rather than a statement about the engine.
        // Unreachable from the collector, and pinned only so the degenerate answer is written down.
        Assert.Equal(
            0,
            await repository.CountOverdueOpenMailboxes(now, limit: 0, TestContext.Current.CancellationToken)
        );
    }

    #endregion

    #region Schema

    [Fact]
    public async Task TheCollectionKeyIndex_CoversBothTheMintsCountAndTheDashboardsRead()
    {
        // One index, three columns, in that order, and every part of that is load-bearing — which is why this
        // pins the definition rather than the name. `status` trailing is what lets one index serve both the
        // mint's three-column equality count and the dashboard's status-agnostic read. The absence of a filter
        // is the other half: a partial index on `status = 'open'`, which EF Core's lambda `HasIndex` overload
        // silently reproduces, cannot serve the status-agnostic read at all — it would still return the right
        // rows, by sequential scan.
        await using var conn = new NpgsqlConnection(fixture.ConnectionString);
        await conn.OpenAsync(TestContext.Current.CancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'engine' AND tablename = 'mailboxes' AND indexdef LIKE '%collection_key%'
            ORDER BY indexname
            """,
            conn
        );

        var found = new List<(string Name, string Definition)>();
        await using var reader = await cmd.ExecuteReaderAsync(TestContext.Current.CancellationToken);
        while (await reader.ReadAsync(TestContext.Current.CancellationToken))
            found.Add((reader.GetString(0), reader.GetString(1)));

        var index = Assert.Single(found);
        Assert.Equal("ix_mailboxes_namespace_collection_key", index.Name);
        Assert.Contains("(namespace, collection_key, status)", index.Definition, StringComparison.Ordinal);
        Assert.DoesNotContain("WHERE", index.Definition, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ARegistryRowMustRecordEitherAParkOrARelease()
    {
        // Every receiver is born having done one of exactly two things, so one of the two stamps is always set. A
        // row with neither describes a receiver in no state at all: both releases filter on
        // `released_at IS NULL` and would take it for one parked forever. Checked at insert rather than trusted
        // of the one code path that writes here.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        await using var context = fixture.CreateDbContext();
        var violation = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync(
                $"""
                INSERT INTO engine.mailbox_receivers (mailbox_id, seq, workflow_id, held_at, released_at, claimed_at)
                VALUES ({mailbox.Id}, 0, {Guid.CreateVersion7()}, NULL, NULL, NULL)
                """,
                TestContext.Current.CancellationToken
            )
        );

        Assert.Equal(PostgresErrorCodes.CheckViolation, violation.SqlState);
        Assert.Contains("ck_mailbox_receivers_birth_is_recorded", violation.Message, StringComparison.Ordinal);
    }

    #endregion
}
