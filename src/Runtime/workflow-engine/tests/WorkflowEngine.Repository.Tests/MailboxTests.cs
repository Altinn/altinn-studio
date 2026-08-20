using Microsoft.EntityFrameworkCore;
using Npgsql;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers the mailbox's schema and its three repository operations against a real database: the mint
/// and its idempotency, the read, and the close.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MailboxTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "test-ns";
    private const int Cap = 100;

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static Task<MailboxMintResult> Mint(
        EngineRepository repository,
        string key,
        TimeSpan? timeout = null,
        string? collectionKey = null,
        DateTimeOffset? now = null,
        int cap = Cap,
        string ns = Ns
    ) =>
        repository.MintMailbox(
            Guid.CreateVersion7(),
            ns,
            key,
            collectionKey,
            timeout ?? TimeSpan.FromHours(1),
            now ?? DateTimeOffset.UtcNow,
            cap,
            TestContext.Current.CancellationToken
        );

    private static MailboxResponse AssertMinted(MailboxMintResult result) =>
        Assert.IsType<MailboxMintResult.Minted>(result).Mailbox;

    #region Mint

    [Fact]
    public async Task MintMailbox_FreshKey_CreatesAnOpenMailboxWithItsDeadlineStamped()
    {
        var repository = fixture.CreateRepository();
        var now = DateTimeOffset.UtcNow;
        var timeout = TimeSpan.FromDays(3);

        var result = await Mint(repository, "key-1", timeout, collectionKey: "col-1", now: now);

        var mailbox = AssertMinted(result);
        Assert.Equal(Ns, mailbox.Namespace);
        Assert.Equal("key-1", mailbox.IdempotencyKey);
        Assert.Equal("col-1", mailbox.CollectionKey);
        Assert.Equal(timeout, mailbox.Timeout);
        Assert.Equal(MailboxStatus.Open, mailbox.Status);
        Assert.Null(mailbox.DisposedReason);
        Assert.Null(mailbox.DisposedAt);

        // The deadline is absolute and derived once, at mint, from the timeout the caller asked for.
        Assert.Equal(now + timeout, mailbox.Deadline, TimeSpan.FromMilliseconds(1));
        Assert.Equal(now, mailbox.CreatedAt, TimeSpan.FromMilliseconds(1));

        // Both logs start empty, so nothing has arrived and nothing has been consumed.
        Assert.Equal(0L, mailbox.NextIdx);
        Assert.Equal(0L, mailbox.NextSeq);
        Assert.Equal(0L, mailbox.UnconsumedDeliveries);
    }

    [Fact]
    public async Task MintMailbox_WithoutCollectionKey_IsAccepted()
    {
        var repository = fixture.CreateRepository();

        var result = await Mint(repository, "key-1", collectionKey: null);

        // The collection reference is grouping only, so a mailbox without one is ordinary.
        Assert.Null(AssertMinted(result).CollectionKey);
    }

    [Fact]
    public async Task MintMailbox_ReplayedKey_ReturnsTheOriginalMailboxUnchanged()
    {
        var repository = fixture.CreateRepository();
        var first = AssertMinted(
            await Mint(repository, "key-1", TimeSpan.FromHours(1), now: DateTimeOffset.UtcNow.AddMinutes(-30))
        );

        // The same key, now with a different timeout and a later clock.
        var replay = await Mint(repository, "key-1", TimeSpan.FromDays(7), now: DateTimeOffset.UtcNow);

        // The replay is answered by the mailbox that already exists; nothing is re-stamped, so a retried step
        // cannot quietly extend the exchange it is replaying.
        var existing = Assert.IsType<MailboxMintResult.Existing>(replay).Mailbox;
        Assert.Equal(first.Id, existing.Id);
        Assert.Equal(first.Timeout, existing.Timeout);
        Assert.Equal(first.Deadline, existing.Deadline);
        Assert.Equal(first.CreatedAt, existing.CreatedAt);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(1, await context.Mailboxes.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task MintMailbox_ReplayedKeyAfterClose_StillReturnsTheClosedMailbox()
    {
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var replay = await Mint(repository, "key-1");

        // The key stays bound to the mailbox it minted for as long as the row lives, so a replay after closure is
        // answered honestly rather than by minting a second mailbox behind the caller's back.
        var existing = Assert.IsType<MailboxMintResult.Existing>(replay).Mailbox;
        Assert.Equal(minted.Id, existing.Id);
        Assert.Equal(MailboxStatus.Disposed, existing.Status);
    }

    [Fact]
    public async Task MintMailbox_SameKeyConcurrently_CreatesExactlyOneMailbox()
    {
        var repositories = Enumerable.Range(0, 8).Select(_ => fixture.CreateRepository()).ToArray();

        var results = await Task.WhenAll(repositories.Select(r => Mint(r, "contested")));

        // The unique index is the mint's serialization point: one winner, and every loser is handed the winner's
        // mailbox rather than an error or an empty answer.
        Assert.Single(results.OfType<MailboxMintResult.Minted>());

        var ids = results
            .Select(r =>
                r switch
                {
                    MailboxMintResult.Minted m => m.Mailbox.Id,
                    MailboxMintResult.Existing e => e.Mailbox.Id,
                    _ => throw new InvalidOperationException($"Unexpected mint result {r}."),
                }
            )
            .Distinct()
            .ToList();
        Assert.Single(ids);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(1, await context.Mailboxes.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task MintMailbox_SameKeyInDifferentNamespaces_AreIndependentMailboxes()
    {
        var repository = fixture.CreateRepository();

        var a = AssertMinted(await Mint(repository, "key-1", ns: "ns-a"));
        var b = AssertMinted(await Mint(repository, "key-1", ns: "ns-b"));

        // The key is unique per namespace, not globally.
        Assert.NotEqual(a.Id, b.Id);
    }

    #endregion

    #region Open-mailboxes cap

    [Fact]
    public async Task MintMailbox_CollectionAtItsCap_IsRefused()
    {
        var repository = fixture.CreateRepository();
        for (int i = 0; i < 3; i++)
            AssertMinted(await Mint(repository, $"key-{i}", collectionKey: "col-1", cap: 3));

        var refused = await Mint(repository, "key-3", collectionKey: "col-1", cap: 3);

        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(refused);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(3, await context.Mailboxes.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task MintMailbox_CollectionAtItsCap_StillAnswersAReplay()
    {
        // The collection is full, and one of the mailboxes filling it is the one being replayed.
        var repository = fixture.CreateRepository();
        var first = AssertMinted(await Mint(repository, "key-0", collectionKey: "col-1", cap: 2));
        AssertMinted(await Mint(repository, "key-1", collectionKey: "col-1", cap: 2));

        // Act
        var replay = await Mint(repository, "key-0", collectionKey: "col-1", cap: 2);

        // A replay creates nothing, so the cap has nothing to say about it. Refusing here would strand a retrying
        // step whose mailbox id is already in a counterparty's hands.
        Assert.Equal(first.Id, Assert.IsType<MailboxMintResult.Existing>(replay).Mailbox.Id);
    }

    [Fact]
    public async Task MintMailbox_CapCountsOnlyOpenMailboxes_SoClosingOneFreesASlot()
    {
        var repository = fixture.CreateRepository();
        var first = AssertMinted(await Mint(repository, "key-0", collectionKey: "col-1", cap: 1));
        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(
            await Mint(repository, "key-1", collectionKey: "col-1", cap: 1)
        );

        await repository.CloseMailbox(
            first.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );
        var afterClose = await Mint(repository, "key-1", collectionKey: "col-1", cap: 1);

        // The cap bounds concurrent exchanges, not the collection's history.
        AssertMinted(afterClose);
    }

    [Fact]
    public async Task MintMailbox_CapIsScopedToOneCollectionAndOneNamespace()
    {
        var repository = fixture.CreateRepository();
        AssertMinted(await Mint(repository, "key-0", collectionKey: "col-1", cap: 1));

        // A different collection, and the same collection key in another namespace, each get their own budget.
        AssertMinted(await Mint(repository, "key-1", collectionKey: "col-2", cap: 1));
        AssertMinted(await Mint(repository, "key-2", collectionKey: "col-1", cap: 1, ns: "other-ns"));
    }

    [Fact]
    public async Task MintMailbox_CapIsBestEffort_SoAMintSeesOnlyTheOpenMailboxesItsOwnSnapshotShows()
    {
        // A characterization test for what the cap is, as opposed to what "maximum" suggests: the count is
        // evaluated against the mint statement's own snapshot, so an uncommitted mailbox is invisible to it.
        // Demonstrated with an uncommitted row rather than by racing real mints, which would also make the test
        // punish an improvement if the cap were ever made exact.
        var repository = fixture.CreateRepository();
        const string CollectionKey = "col-1";

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var uncommitted = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);

        const string insertSql = """
            INSERT INTO engine.mailboxes (
                id, namespace, idempotency_key, collection_key, timeout, deadline,
                next_idx, next_seq, status, disposed_reason, created_at, disposed_at
            )
            VALUES (@id, @ns, @key, @collection_key, @timeout, @deadline, 0, 0, 'open', NULL, @now, NULL)
            """;

        await using (var insert = new NpgsqlCommand(insertSql, blocker, uncommitted))
        {
            var now = DateTimeOffset.UtcNow;
            insert.Parameters.Add(new NpgsqlParameter<Guid>("id", Guid.CreateVersion7()));
            insert.Parameters.Add(new NpgsqlParameter<string>("ns", Ns));
            insert.Parameters.Add(new NpgsqlParameter<string>("key", "uncommitted"));
            insert.Parameters.Add(new NpgsqlParameter<string>("collection_key", CollectionKey));
            insert.Parameters.Add(new NpgsqlParameter<TimeSpan>("timeout", TimeSpan.FromHours(1)));
            insert.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("deadline", now.AddHours(1)));
            insert.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
            await insert.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        // The collection already holds an open mailbox, but not one this mint's snapshot can see. Nothing raced.
        AssertMinted(await Mint(repository, "admitted", collectionKey: CollectionKey, cap: 1));

        await uncommitted.CommitAsync(TestContext.Current.CancellationToken);

        // Two open mailboxes in a collection capped at one — the overshoot, bounded by what was in flight. The
        // guard still guards: the next mint sees the real count and is refused.
        await using var context = fixture.CreateDbContext();
        Assert.Equal(
            2,
            await context.Mailboxes.CountAsync(
                m => m.CollectionKey == CollectionKey && m.Status == MailboxStatus.Open,
                TestContext.Current.CancellationToken
            )
        );
        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(
            await Mint(repository, "refused", collectionKey: CollectionKey, cap: 1)
        );
    }

    [Fact]
    public async Task MintMailbox_WithoutCollectionKey_IsNotCapped()
    {
        // A characterization test, not an endorsement: the cap is per collection, so a mailbox minted without a
        // collection key has nothing to be counted against. The app library always supplies one, and bounding a
        // caller that omits it would take a different (namespace-wide) bound rather than this one reinterpreted.
        var repository = fixture.CreateRepository();

        for (int i = 0; i < 5; i++)
            AssertMinted(await Mint(repository, $"key-{i}", collectionKey: null, cap: 1));

        await using var context = fixture.CreateDbContext();
        Assert.Equal(5, await context.Mailboxes.CountAsync(TestContext.Current.CancellationToken));
    }

    #endregion

    #region Read

    [Fact]
    public async Task GetMailbox_ExistingMailbox_ReturnsIt()
    {
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1", collectionKey: "col-1"));

        var read = await repository.GetMailbox(minted.Id, Ns, TestContext.Current.CancellationToken);

        Assert.NotNull(read);
        Assert.Equal(minted.Id, read.Id);
        Assert.Equal(minted.Deadline, read.Deadline);
        Assert.Equal(minted.CollectionKey, read.CollectionKey);
    }

    [Fact]
    public async Task GetMailbox_UnknownIdOrForeignNamespace_ReturnsNull()
    {
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));

        // The namespace is part of the address, not a filter applied afterwards.
        Assert.Null(await repository.GetMailbox(Guid.CreateVersion7(), Ns, TestContext.Current.CancellationToken));
        Assert.Null(await repository.GetMailbox(minted.Id, "other-ns", TestContext.Current.CancellationToken));
    }

    #endregion

    #region Close

    [Fact]
    public async Task CloseMailbox_OpenMailbox_MarksItDisposedByRequest()
    {
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        var closedAt = DateTimeOffset.UtcNow;

        var result = await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            closedAt,
            TestContext.Current.CancellationToken
        );

        var closed = Assert.IsType<MailboxCloseResult.Closed>(result).Mailbox;
        Assert.Equal(MailboxStatus.Disposed, closed.Status);
        Assert.Equal(MailboxDisposedReason.Request, closed.DisposedReason);
        Assert.NotNull(closed.DisposedAt);
        Assert.Equal(closedAt, closed.DisposedAt.Value, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task CloseMailbox_ChangesNothingButTheDisposalFields()
    {
        // Closing means one thing — closed for deliveries — and pinning that keeps later steps from widening it.
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1", collectionKey: "col-1"));

        var result = await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var closed = Assert.IsType<MailboxCloseResult.Closed>(result).Mailbox;
        Assert.Equal(minted.Deadline, closed.Deadline);
        Assert.Equal(minted.Timeout, closed.Timeout);
        Assert.Equal(minted.CreatedAt, closed.CreatedAt);
        Assert.Equal(minted.CollectionKey, closed.CollectionKey);
        Assert.Equal(minted.IdempotencyKey, closed.IdempotencyKey);
        Assert.Equal(0L, closed.NextIdx);
        Assert.Equal(0L, closed.NextSeq);
    }

    [Fact]
    public async Task CloseMailbox_Repeat_ReportsTheOriginalDisposal()
    {
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        var firstClose = DateTimeOffset.UtcNow.AddMinutes(-5);
        await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            firstClose,
            TestContext.Current.CancellationToken
        );

        var repeat = await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        // Idempotent, and the answer describes the close that happened rather than this call.
        var already = Assert.IsType<MailboxCloseResult.AlreadyClosed>(repeat).Mailbox;
        Assert.NotNull(already.DisposedAt);
        Assert.Equal(firstClose, already.DisposedAt.Value, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task CloseMailbox_AfterAnotherReasonClosedIt_KeepsTheOriginalReason()
    {
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Deadline,
            DateTimeOffset.UtcNow.AddMinutes(-1),
            TestContext.Current.CancellationToken
        );

        var repeat = await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        // First close wins outright. Whoever closed it is what the reason has to say, because consumers word
        // their conclusion from it.
        var already = Assert.IsType<MailboxCloseResult.AlreadyClosed>(repeat).Mailbox;
        Assert.Equal(MailboxDisposedReason.Deadline, already.DisposedReason);
    }

    [Fact]
    public async Task CloseMailbox_UnknownIdOrForeignNamespace_ReturnsNotFound()
    {
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));

        Assert.IsType<MailboxCloseResult.NotFound>(
            await repository.CloseMailbox(
                Guid.CreateVersion7(),
                Ns,
                MailboxDisposedReason.Request,
                DateTimeOffset.UtcNow,
                TestContext.Current.CancellationToken
            )
        );
        Assert.IsType<MailboxCloseResult.NotFound>(
            await repository.CloseMailbox(
                minted.Id,
                "other-ns",
                MailboxDisposedReason.Request,
                DateTimeOffset.UtcNow,
                TestContext.Current.CancellationToken
            )
        );

        await using var context = fixture.CreateDbContext();
        var row = await context.Mailboxes.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(MailboxStatus.Open, row.Status);
    }

    #endregion

    [Fact]
    public async Task DisposalFields_MustBeWrittenTogetherWithTheStatus()
    {
        // Pins ck_mailboxes_disposal_is_complete. Every code path writes the three disposal fields in one
        // statement, so the constraint is invisible in normal operation — and MailboxResponse's contract
        // ("disposedReason is null exactly while the mailbox is open") is only true if the schema refuses the
        // half-written form.
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));

        await using var context = fixture.CreateDbContext();

        var halfWritten = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync(
                $"UPDATE engine.mailboxes SET status = 'disposed' WHERE id = {minted.Id}",
                TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(PostgresErrorCodes.CheckViolation, halfWritten.SqlState);
        Assert.Contains("ck_mailboxes_disposal_is_complete", halfWritten.Message, StringComparison.Ordinal);

        // The mirror image is refused too, which is what makes the contract biconditional.
        var stampedWhileOpen = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync(
                $"UPDATE engine.mailboxes SET disposed_at = now() WHERE id = {minted.Id}",
                TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(PostgresErrorCodes.CheckViolation, stampedWhileOpen.SqlState);

        // And the row is untouched by either attempt.
        var unchanged = await repository.GetMailbox(minted.Id, Ns, TestContext.Current.CancellationToken);
        Assert.NotNull(unchanged);
        Assert.Equal(MailboxStatus.Open, unchanged.Status);
        Assert.Null(unchanged.DisposedReason);
        Assert.Null(unchanged.DisposedAt);
    }

    #region The mailbox row is the serialization point

    [Fact]
    public async Task CloseMailbox_ConcurrentCalls_ExactlyOneCloses_AndTheRestReplayTheSameDisposal()
    {
        // The semantic half of the lock-first discipline: under read-then-write every caller could observe
        // "open" and then write its own disposal, producing several closes with different timestamps.
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        var closers = Enumerable.Range(0, 8).Select(_ => fixture.CreateRepository()).ToArray();

        var results = await Task.WhenAll(
            closers.Select(r =>
                r.CloseMailbox(
                    minted.Id,
                    Ns,
                    MailboxDisposedReason.Request,
                    DateTimeOffset.UtcNow,
                    TestContext.Current.CancellationToken
                )
            )
        );

        Assert.Single(results.OfType<MailboxCloseResult.Closed>());

        var disposedAt = results
            .Select(r =>
                r switch
                {
                    MailboxCloseResult.Closed c => c.Mailbox.DisposedAt,
                    MailboxCloseResult.AlreadyClosed a => a.Mailbox.DisposedAt,
                    _ => throw new InvalidOperationException($"Unexpected close result {r}."),
                }
            )
            .Distinct()
            .ToList();
        Assert.Single(disposedAt);
    }

    [Fact]
    public async Task CloseMailbox_CannotEvenReadTheMailboxWhileItsRowLockIsHeldElsewhere()
    {
        // The structural half, exercised through the one verdict a read-before-lock implementation could reach
        // without ever writing: the mailbox is already closed before the racing close starts, so such an
        // implementation would answer AlreadyClosed from its own snapshot. Racing against an open mailbox
        // would prove nothing — that close has to write, and a write blocks on the row lock either way.
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        Assert.IsType<MailboxCloseResult.Closed>(
            await repository.CloseMailbox(
                minted.Id,
                Ns,
                MailboxDisposedReason.Request,
                DateTimeOffset.UtcNow,
                TestContext.Current.CancellationToken
            )
        );

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
            lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", minted.Id));
            await lockCmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        var close = repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(
            close.IsCompleted,
            "CloseMailbox answered from an unlocked read: it reported the mailbox already closed while the row lock was held elsewhere."
        );

        await blockingTx.RollbackAsync(TestContext.Current.CancellationToken);

        Assert.IsType<MailboxCloseResult.AlreadyClosed>(await close);
    }

    #endregion

    #region The workflow sweeps stay out of it

    /// <summary>
    /// Retention settings for the sweeps below. Built here because the fixture leaves
    /// <see cref="RetentionSettings"/> at its zero-valued default, and a zero <c>BatchSize</c> makes the purge
    /// loop's condition never terminate.
    /// </summary>
    private static readonly RetentionSettings _retention = new()
    {
        RetentionPeriod = TimeSpan.FromDays(60),
        BatchSize = 1000,
        Interval = TimeSpan.FromHours(2),
    };

    [Fact]
    public async Task OverdueMailbox_IsClosedOnlyByTheMailboxSweep_NeverByTheWorkflowSweeps()
    {
        // Mailboxes are not workflows, and the sweeps that recover workflows must keep not knowing they exist:
        // every workflow-shaped sweep runs against an overdue mailbox first and leaves it exactly as it was.
        var repository = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();
        var minted = AssertMinted(
            await Mint(repository, "key-1", TimeSpan.FromMinutes(1), now: DateTimeOffset.UtcNow.AddDays(-30))
        );
        Assert.True(minted.Deadline < DateTimeOffset.UtcNow);

        var now = DateTimeOffset.UtcNow;
        var ct = TestContext.Current.CancellationToken;
        await maintenance.ReclaimStaleWorkflows(now, fixture.Settings, ct);
        await maintenance.FailPoisonedWorkflows(now, fixture.Settings, ct);
        await maintenance.RecoverDependencyResolvedWorkflows(now, ct);
        await maintenance.PurgeExpiredWorkflows(now, _retention, ct);

        var afterWorkflowSweeps = await repository.GetMailbox(minted.Id, Ns, ct);
        Assert.NotNull(afterWorkflowSweeps);
        Assert.Equal(MailboxStatus.Open, afterWorkflowSweeps.Status);

        Assert.Equal(1, (await repository.SweepOverdueMailboxes(now, batchSize: 100, ct)).Closed);

        var afterMailboxSweep = await repository.GetMailbox(minted.Id, Ns, ct);
        Assert.NotNull(afterMailboxSweep);
        Assert.Equal(MailboxStatus.Disposed, afterMailboxSweep.Status);
        Assert.Equal(MailboxDisposedReason.Deadline, afterMailboxSweep.DisposedReason);
    }

    [Fact]
    public async Task DisposedMailboxPastRetention_IsPurgedByTheMailboxRetentionSweep_NotTheWorkflowOne()
    {
        // The mirror image on the retention side: the workflow purge never sees a mailbox, so the closed one
        // survives it and goes only when the purge written for mailboxes runs.
        var repository = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();
        var longAgo = DateTimeOffset.UtcNow - _retention.RetentionPeriod - TimeSpan.FromDays(1);
        var minted = AssertMinted(await Mint(repository, "key-1", now: longAgo));
        var ct = TestContext.Current.CancellationToken;
        await repository.CloseMailbox(minted.Id, Ns, MailboxDisposedReason.Request, longAgo, ct);

        await maintenance.PurgeExpiredWorkflows(DateTimeOffset.UtcNow, _retention, ct);

        var afterWorkflowPurge = await repository.GetMailbox(minted.Id, Ns, ct);
        Assert.NotNull(afterWorkflowPurge);
        Assert.Equal(MailboxStatus.Disposed, afterWorkflowPurge.Status);

        await maintenance.PurgeExpiredMailboxes(DateTimeOffset.UtcNow, _retention, ct);

        Assert.Null(await repository.GetMailbox(minted.Id, Ns, ct));
    }

    #endregion
}
