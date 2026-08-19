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
        // Arrange
        var repository = fixture.CreateRepository();
        var now = DateTimeOffset.UtcNow;
        var timeout = TimeSpan.FromDays(3);

        // Act
        var result = await Mint(repository, "key-1", timeout, collectionKey: "col-1", now: now);

        // Assert
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
        // Arrange
        var repository = fixture.CreateRepository();

        // Act
        var result = await Mint(repository, "key-1", collectionKey: null);

        // Assert — the collection reference is grouping only, so a mailbox without one is ordinary.
        Assert.Null(AssertMinted(result).CollectionKey);
    }

    [Fact]
    public async Task MintMailbox_ReplayedKey_ReturnsTheOriginalMailboxUnchanged()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var first = AssertMinted(
            await Mint(repository, "key-1", TimeSpan.FromHours(1), now: DateTimeOffset.UtcNow.AddMinutes(-30))
        );

        // Act — the same key, now with a different timeout and a later clock.
        var replay = await Mint(repository, "key-1", TimeSpan.FromDays(7), now: DateTimeOffset.UtcNow);

        // Assert — the replay is answered by the mailbox that already exists; nothing is re-stamped, so
        // a retried step cannot quietly extend the exchange it is replaying.
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
        // Arrange
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        // Act
        var replay = await Mint(repository, "key-1");

        // Assert — the key stays bound to the mailbox it minted for as long as the row lives. A replay
        // after closure is answered honestly rather than by minting a second mailbox behind the
        // caller's back.
        var existing = Assert.IsType<MailboxMintResult.Existing>(replay).Mailbox;
        Assert.Equal(minted.Id, existing.Id);
        Assert.Equal(MailboxStatus.Disposed, existing.Status);
    }

    [Fact]
    public async Task MintMailbox_SameKeyConcurrently_CreatesExactlyOneMailbox()
    {
        // Arrange — separate repositories so the two mints run on separate connections.
        var repositories = Enumerable.Range(0, 8).Select(_ => fixture.CreateRepository()).ToArray();

        // Act
        var results = await Task.WhenAll(repositories.Select(r => Mint(r, "contested")));

        // Assert — the unique index is the mint's serialization point: one winner, and every loser is
        // handed the winner's mailbox rather than an error or an empty answer.
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
        // Arrange
        var repository = fixture.CreateRepository();

        // Act
        var a = AssertMinted(await Mint(repository, "key-1", ns: "ns-a"));
        var b = AssertMinted(await Mint(repository, "key-1", ns: "ns-b"));

        // Assert — the key is unique per namespace, not globally.
        Assert.NotEqual(a.Id, b.Id);
    }

    #endregion

    #region Open-mailboxes cap

    [Fact]
    public async Task MintMailbox_CollectionAtItsCap_IsRefused()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        for (int i = 0; i < 3; i++)
            AssertMinted(await Mint(repository, $"key-{i}", collectionKey: "col-1", cap: 3));

        // Act
        var refused = await Mint(repository, "key-3", collectionKey: "col-1", cap: 3);

        // Assert
        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(refused);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(3, await context.Mailboxes.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task MintMailbox_CollectionAtItsCap_StillAnswersAReplay()
    {
        // Arrange — the collection is full, and one of the mailboxes filling it is the one being
        // replayed.
        var repository = fixture.CreateRepository();
        var first = AssertMinted(await Mint(repository, "key-0", collectionKey: "col-1", cap: 2));
        AssertMinted(await Mint(repository, "key-1", collectionKey: "col-1", cap: 2));

        // Act
        var replay = await Mint(repository, "key-0", collectionKey: "col-1", cap: 2);

        // Assert — a replay creates nothing, so the cap has nothing to say about it. Refusing here would
        // strand a retrying step whose mailbox id is already in a counterparty's hands.
        Assert.Equal(first.Id, Assert.IsType<MailboxMintResult.Existing>(replay).Mailbox.Id);
    }

    [Fact]
    public async Task MintMailbox_CapCountsOnlyOpenMailboxes_SoClosingOneFreesASlot()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var first = AssertMinted(await Mint(repository, "key-0", collectionKey: "col-1", cap: 1));
        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(
            await Mint(repository, "key-1", collectionKey: "col-1", cap: 1)
        );

        // Act
        await repository.CloseMailbox(
            first.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );
        var afterClose = await Mint(repository, "key-1", collectionKey: "col-1", cap: 1);

        // Assert — the cap bounds concurrent exchanges, not the collection's history.
        AssertMinted(afterClose);
    }

    [Fact]
    public async Task MintMailbox_CapIsScopedToOneCollectionAndOneNamespace()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        AssertMinted(await Mint(repository, "key-0", collectionKey: "col-1", cap: 1));

        // Act + Assert — a different collection, and the same collection key in another namespace, each
        // get their own budget.
        AssertMinted(await Mint(repository, "key-1", collectionKey: "col-2", cap: 1));
        AssertMinted(await Mint(repository, "key-2", collectionKey: "col-1", cap: 1, ns: "other-ns"));
    }

    [Fact]
    public async Task MintMailbox_CapIsBestEffort_SoAMintSeesOnlyTheOpenMailboxesItsOwnSnapshotShows()
    {
        // A characterization test for what the cap is, as opposed to what "maximum" suggests. The count
        // is evaluated against the snapshot the mint statement runs on, so a mailbox that exists but is
        // not yet committed is invisible to it and the mint is admitted — which is exactly why mints in
        // flight together can each see room and the collection can settle above the cap.
        //
        // Demonstrated with an uncommitted row rather than by racing real mints: the property under test
        // is snapshot visibility, and holding a transaction open exhibits it directly instead of hoping a
        // burst interleaves. Racing would also make the test punish an improvement — if the cap were ever
        // made exact, a race-based test would fail the build for it, while this one simply stops passing
        // for a stated reason.
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

        // The collection already holds an open mailbox, but not one this mint's snapshot can see, so the
        // cap of one does not bind and the mint is admitted. Nothing here raced; the outcome is forced.
        AssertMinted(await Mint(repository, "admitted", collectionKey: CollectionKey, cap: 1));

        await uncommitted.CommitAsync(TestContext.Current.CancellationToken);

        // Two open mailboxes now sit in a collection capped at one — the overshoot, bounded by what was
        // in flight. The guard itself still guards: the next mint sees the real count and is refused.
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
        // A characterization test, not an endorsement: the cap is per collection, so a mailbox minted
        // without a collection key has nothing to be counted against and is admitted no matter how many
        // already exist. The app library always supplies a collection key, which is what makes this
        // acceptable; if a caller that omits it ever needs bounding, the bound has to be a different one
        // (namespace-wide) rather than this one reinterpreted.
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
        // Arrange
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1", collectionKey: "col-1"));

        // Act
        var read = await repository.GetMailbox(minted.Id, Ns, TestContext.Current.CancellationToken);

        // Assert
        Assert.NotNull(read);
        Assert.Equal(minted.Id, read.Id);
        Assert.Equal(minted.Deadline, read.Deadline);
        Assert.Equal(minted.CollectionKey, read.CollectionKey);
    }

    [Fact]
    public async Task GetMailbox_UnknownIdOrForeignNamespace_ReturnsNull()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));

        // Act + Assert — the namespace is part of the address, not a filter applied afterwards.
        Assert.Null(await repository.GetMailbox(Guid.CreateVersion7(), Ns, TestContext.Current.CancellationToken));
        Assert.Null(await repository.GetMailbox(minted.Id, "other-ns", TestContext.Current.CancellationToken));
    }

    #endregion

    #region Close

    [Fact]
    public async Task CloseMailbox_OpenMailbox_MarksItDisposedByRequest()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        var closedAt = DateTimeOffset.UtcNow;

        // Act
        var result = await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            closedAt,
            TestContext.Current.CancellationToken
        );

        // Assert
        var closed = Assert.IsType<MailboxCloseResult.Closed>(result).Mailbox;
        Assert.Equal(MailboxStatus.Disposed, closed.Status);
        Assert.Equal(MailboxDisposedReason.Request, closed.DisposedReason);
        Assert.NotNull(closed.DisposedAt);
        Assert.Equal(closedAt, closed.DisposedAt.Value, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task CloseMailbox_ChangesNothingButTheDisposalFields()
    {
        // Closing means one thing — closed for deliveries. It is not a place to also adjust the
        // deadline, the counters or the collection reference, and pinning that keeps later steps from
        // quietly widening it.
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
        // Arrange
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

        // Act
        var repeat = await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        // Assert — idempotent, and the answer describes the close that happened rather than this call.
        var already = Assert.IsType<MailboxCloseResult.AlreadyClosed>(repeat).Mailbox;
        Assert.NotNull(already.DisposedAt);
        Assert.Equal(firstClose, already.DisposedAt.Value, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task CloseMailbox_AfterAnotherReasonClosedIt_KeepsTheOriginalReason()
    {
        // Arrange — a mailbox already closed for a different reason than the one this call carries.
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));
        await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Deadline,
            DateTimeOffset.UtcNow.AddMinutes(-1),
            TestContext.Current.CancellationToken
        );

        // Act
        var repeat = await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        // Assert — first close wins outright. Whoever closed it is what the reason has to say, because
        // consumers word their conclusion from it.
        var already = Assert.IsType<MailboxCloseResult.AlreadyClosed>(repeat).Mailbox;
        Assert.Equal(MailboxDisposedReason.Deadline, already.DisposedReason);
    }

    [Fact]
    public async Task CloseMailbox_UnknownIdOrForeignNamespace_ReturnsNotFound()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var minted = AssertMinted(await Mint(repository, "key-1"));

        // Act + Assert
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
        // Pins ck_mailboxes_disposal_is_complete. Every code path today writes the three disposal fields
        // in one statement, so the constraint is invisible in normal operation — which is precisely why
        // it is worth an explicit test: the steps that add the closure sweep and the receiver release are
        // the ones that could write a status without its reason and instant, and MailboxResponse's
        // contract ("disposedReason is null exactly while the mailbox is open") is only true if the
        // schema refuses the half-written form.
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

        // The mirror image is refused too, which is what makes the contract biconditional rather than
        // merely "a disposed mailbox has its fields".
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
        // The semantic half of the lock-first discipline. Under a read-then-write implementation every
        // caller could observe "open" and every caller could then write its own disposal, producing
        // several closes with different timestamps. Taking the row lock before reading anything is what
        // collapses them onto one.
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
        // The structural half, and it is exercised through the one verdict a read-before-lock
        // implementation could reach without ever writing: the mailbox is *already closed* before the
        // racing close starts. Such an implementation would read the disposed row from its own snapshot
        // and answer AlreadyClosed immediately, so it is red here; this one takes SELECT ... FOR UPDATE as
        // the transaction's first act and cannot answer until the lock is free.
        //
        // Racing a close against an *open* mailbox would prove nothing — that close has to write, and a
        // write blocks on the row lock whatever order the code reads in.
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

    #region Gaps later steps close

    /// <summary>
    /// Retention settings for the sweeps below. Built here rather than taken from the fixture because
    /// the fixture leaves <see cref="RetentionSettings"/> at its zero-valued default, and a zero
    /// <c>BatchSize</c> makes the purge loop's <c>while (deleted &gt;= batchSize)</c> condition never
    /// terminate.
    /// </summary>
    private static readonly RetentionSettings _retention = new()
    {
        RetentionPeriod = TimeSpan.FromDays(60),
        BatchSize = 1000,
        Interval = TimeSpan.FromHours(2),
    };

    [Fact]
    public async Task OverdueMailbox_IsLeftOpenByEveryMaintenanceSweepThatExistsToday()
    {
        // A characterization test for a gap the deadline sweep closes later: the deadline is stamped at
        // mint and reported on every read, but in this step nothing acts on it. An overdue mailbox keeps
        // accepting whatever a mailbox accepts until somebody closes it explicitly.
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

        var afterSweeps = await repository.GetMailbox(minted.Id, Ns, ct);
        Assert.NotNull(afterSweeps);
        Assert.Equal(MailboxStatus.Open, afterSweeps.Status);
    }

    [Fact]
    public async Task DisposedMailboxPastRetention_IsLeftInPlaceByTheRetentionSweep()
    {
        // The second half of the same gap: mailboxes are not workflows, so the existing retention sweep
        // never sees them. A closed mailbox — and, later, its deliveries and waiters — stays readable
        // until a sweep that knows about mailboxes purges it.
        var repository = fixture.CreateRepository();
        var maintenance = fixture.CreateMaintenanceService();
        var longAgo = DateTimeOffset.UtcNow - _retention.RetentionPeriod - TimeSpan.FromDays(1);
        var minted = AssertMinted(await Mint(repository, "key-1", now: longAgo));
        await repository.CloseMailbox(
            minted.Id,
            Ns,
            MailboxDisposedReason.Request,
            longAgo,
            TestContext.Current.CancellationToken
        );

        await maintenance.PurgeExpiredWorkflows(
            DateTimeOffset.UtcNow,
            _retention,
            TestContext.Current.CancellationToken
        );

        var afterSweep = await repository.GetMailbox(minted.Id, Ns, TestContext.Current.CancellationToken);
        Assert.NotNull(afterSweep);
        Assert.Equal(MailboxStatus.Disposed, afterSweep.Status);
    }

    #endregion
}
