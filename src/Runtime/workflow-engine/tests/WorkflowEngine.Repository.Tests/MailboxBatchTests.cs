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
/// Covers the batched mailbox repository methods — the flush a buffer performs, as opposed to the single
/// caller's call the rest of the mailbox suites drive. Two things separate a batch from a run of separate
/// calls, and both are established here: every position is answered with the verdict its own call would have
/// received, and the races separate calls would have had against each other are folded inside the flush.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MailboxBatchTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "batch-ns";

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    #region Minting a batch

    [Fact]
    public async Task BatchMint_KeyNamedTwiceInOneBatch_MintsOneMailboxAndReplaysItToTheRepeat()
    {
        // Arrange: two requests, two candidate ids, one key — the race two separate calls would have had on the
        // unique index, folded into the batch. Which of the two is credited with the mint is the fold's decision
        // and not the statement's: left to ON CONFLICT DO NOTHING, both requests would still be answered, but
        // the one called Minted would be whichever the sort emitted first out of two equal keys.
        var repository = fixture.CreateRepository();
        var (firstCandidate, secondCandidate) = (Guid.CreateVersion7(), Guid.CreateVersion7());

        // Act
        var results = await BatchMint(
            repository,
            MintRequest("named-twice", firstCandidate),
            MintRequest("named-twice", secondCandidate)
        );

        // Assert
        var minted = Assert.IsType<MailboxMintResult.Minted>(results[0]).Mailbox;
        Assert.Equal(firstCandidate, minted.Id);

        // The repeat is answered the mailbox that exists, not a mint of its own candidate id.
        var replay = Assert.IsType<MailboxMintResult.Existing>(results[1]).Mailbox;
        Assert.Equal(firstCandidate, replay.Id);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(firstCandidate, (await context.Mailboxes.SingleAsync(Ct)).Id);
    }

    [Fact]
    public async Task BatchMint_FreshMintsInOneCollection_CountAgainstTheCapAsEachOthersPeers()
    {
        // Arrange: nothing open yet, so every refusal below comes from the batch counting itself.
        var repository = fixture.CreateRepository();

        // Act
        var results = await BatchMint(
            repository,
            cap: 2,
            MintRequest("k-0", collectionKey: "col"),
            MintRequest("k-1", collectionKey: "col"),
            MintRequest("k-2", collectionKey: "col")
        );

        // Assert: the cap binds in batch order — a flush cannot overshoot it the way three concurrent calls
        // reading one empty count could.
        Assert.Equal("k-0", Assert.IsType<MailboxMintResult.Minted>(results[0]).Mailbox.IdempotencyKey);
        Assert.Equal("k-1", Assert.IsType<MailboxMintResult.Minted>(results[1]).Mailbox.IdempotencyKey);
        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(results[2]);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(2, await context.Mailboxes.CountAsync(Ct));
    }

    [Fact]
    public async Task BatchMint_KeyNamedTwiceInOneBatch_CostsItsCollectionOneSlotNotTwo()
    {
        // Arrange & act: a cap of two, and a batch whose three requests name only two mailboxes.
        var repository = fixture.CreateRepository();

        var results = await BatchMint(
            repository,
            2,
            MintRequest("k-0", collectionKey: "col"),
            MintRequest("k-0", collectionKey: "col"),
            MintRequest("k-1", collectionKey: "col")
        );

        // Assert: the repeat is not a second mailbox, so the collection's second slot is still the fresh key's
        // to take. A batch that let its duplicates rank against the cap would refuse this last request.
        Assert.IsType<MailboxMintResult.Minted>(results[0]);
        Assert.IsType<MailboxMintResult.Existing>(results[1]);
        Assert.Equal("k-1", Assert.IsType<MailboxMintResult.Minted>(results[2]).Mailbox.IdempotencyKey);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(2, await context.Mailboxes.CountAsync(Ct));
    }

    [Fact]
    public async Task BatchMint_ReplayedKeyWithItsCollectionAlreadyFull_IsStillAnswered()
    {
        // Arrange: the collection is at its cap before the batch starts.
        var repository = fixture.CreateRepository();
        var original = await Mint(repository, "k-0", collectionKey: "col", cap: 1);

        // Act
        var results = await BatchMint(
            repository,
            cap: 1,
            MintRequest("k-0", collectionKey: "col"),
            MintRequest("k-1", collectionKey: "col")
        );

        // Assert: a replay is a read of a mailbox that exists, so the cap has nothing to say about it; a fresh
        // key in the same batch is refused.
        Assert.Equal(original.Id, Assert.IsType<MailboxMintResult.Existing>(results[0]).Mailbox.Id);
        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(results[1]);
    }

    [Fact]
    public async Task BatchMint_ReplayedKey_ConsumesNoneOfItsCollectionsCap()
    {
        // Arrange: one of the cap's two slots is taken, leaving exactly one for the batch to hand out.
        var repository = fixture.CreateRepository();
        var original = await Mint(repository, "k-0", collectionKey: "col", cap: 2);

        // Act
        var results = await BatchMint(
            repository,
            cap: 2,
            MintRequest("k-0", collectionKey: "col"),
            MintRequest("k-1", collectionKey: "col"),
            MintRequest("k-2", collectionKey: "col")
        );

        // Assert: the fresh key behind the replay gets the free slot. Had the replay ranked as a peer ahead of
        // it, this would be a refusal — which is the whole difference between counting keys and counting
        // mailboxes.
        Assert.Equal(original.Id, Assert.IsType<MailboxMintResult.Existing>(results[0]).Mailbox.Id);
        Assert.Equal("k-1", Assert.IsType<MailboxMintResult.Minted>(results[1]).Mailbox.IdempotencyKey);
        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(results[2]);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(2, await context.Mailboxes.CountAsync(Ct));
    }

    [Fact]
    public async Task BatchMint_KeyAlreadyHeldByTheCandidateIdItself_IsMintedRatherThanAReplay()
    {
        // Arrange: the row already carries the id the batch is about to name it with — what a retried attempt
        // sees when the attempt before it committed after the client had given up on the answer.
        var repository = fixture.CreateRepository();
        var mailboxId = Guid.CreateVersion7();
        Assert.IsType<MailboxMintResult.Minted>(
            await repository.MintMailbox(
                mailboxId,
                Ns,
                "already-mine",
                collectionKey: null,
                TimeSpan.FromHours(1),
                Now,
                maxOpenPerCollection: 1000,
                Ct
            )
        );

        // Act
        var results = await BatchMint(repository, MintRequest("already-mine", mailboxId));

        // Assert: its own candidate id on the row is what separates a mint from a replay, whichever of the two
        // reads found the row.
        Assert.Equal(mailboxId, Assert.IsType<MailboxMintResult.Minted>(Assert.Single(results)).Mailbox.Id);
    }

    [Fact]
    public async Task BatchMint_OneCollectionKeyInTwoNamespaces_CountsEachAgainstItsOwnCap()
    {
        // Arrange & act: a cap of one, and two fresh mints that share a collection key but not a namespace.
        var repository = fixture.CreateRepository();

        var results = await BatchMint(
            repository,
            1,
            MintRequest("k-a", collectionKey: "col", ns: "ns-a"),
            MintRequest("k-b", collectionKey: "col", ns: "ns-b")
        );

        // Assert: neither is the other's peer, so neither is refused.
        Assert.All(results, result => Assert.IsType<MailboxMintResult.Minted>(result));
    }

    [Fact]
    public async Task BatchMint_ConcurrentBatchesOverOneKey_CreateExactlyOneMailbox()
    {
        // Arrange: eight flushes, each naming the contested key first and a key of its own second. The mint
        // takes no lock, so this is the unique index doing the serializing — and the second position is what
        // proves a batch that lost the race still committed everything else it carried.
        var repositories = Enumerable.Range(0, 8).Select(_ => fixture.CreateRepository()).ToArray();

        // Act
        var results = await Task.WhenAll(
            repositories.Select(
                (repository, i) => BatchMint(repository, MintRequest("contested"), MintRequest($"own-{i}"))
            )
        );

        // Assert
        var contested = results.Select(batch => batch[0]).ToArray();
        Assert.Single(contested.OfType<MailboxMintResult.Minted>());
        Assert.Single(contested.Select(MailboxIdOf).Distinct());
        Assert.All(results, batch => Assert.IsType<MailboxMintResult.Minted>(batch[1]));

        await using var context = fixture.CreateDbContext();
        Assert.Equal(9, await context.Mailboxes.CountAsync(Ct));
    }

    [Fact]
    public async Task BatchMint_AFullFlushOfMailboxes_MintsEveryOneUpToEachCollectionsCap()
    {
        // Arrange: the batch size a buffer flushes at, so the array statements run at production width rather
        // than the singleton the plan test pins — and spread over four collections filled exactly to a cap of
        // 25, so the last admitted mint of each is the one the peer count only just lets through.
        var repository = fixture.CreateRepository();
        var requests = Enumerable
            .Range(0, 100)
            .Select(i => MintRequest($"flush-{i}", collectionKey: $"col-{i % 4}"))
            .ToArray();

        // Act
        var results = await BatchMint(repository, 25, requests);

        // Assert
        Assert.Equal(100, results.OfType<MailboxMintResult.Minted>().Count());
        Assert.Equal(
            requests.Select(request => request.MailboxId).Order(),
            results.OfType<MailboxMintResult.Minted>().Select(minted => minted.Mailbox.Id).Order()
        );

        // Each collection is now full, so the next mint into one is refused.
        Assert.IsType<MailboxMintResult.AtCollectionCapacity>(
            Assert.Single(await BatchMint(repository, 25, MintRequest("one-too-many", collectionKey: "col-0")))
        );

        await using var context = fixture.CreateDbContext();
        Assert.Equal(100, await context.Mailboxes.CountAsync(Ct));
    }

    #endregion

    #region Closing a batch

    [Fact]
    public async Task BatchClose_ClosesEveryOpenMailbox_AndReleasesEveryReceiverParkedOnIt()
    {
        // Arrange: three mailboxes with nothing, one and two receivers parked on them, each closed with its own
        // reason at its own instant — the per-request values ride in the statement's arrays, so a batch that
        // collapsed them onto one element would still close every mailbox.
        var repository = fixture.CreateRepository();
        var empty = await Mint(repository, "empty");
        var single = await Mint(repository, "single");
        var crowded = await Mint(repository, "crowded");

        var parkedOnSingle = await EnqueueReceiver(repository, single.Id, "r-single");
        var parkedOnCrowded = new[]
        {
            await EnqueueReceiver(repository, crowded.Id, "r-crowded-0"),
            await EnqueueReceiver(repository, crowded.Id, "r-crowded-1"),
        };

        var (emptyAt, singleAt, crowdedAt) = (Now.AddSeconds(-30), Now.AddSeconds(-20), Now.AddSeconds(-10));

        // Act
        var results = await BatchClose(
            repository,
            CloseRequest(empty.Id, emptyAt),
            CloseRequest(single.Id, singleAt, MailboxDisposedReason.Deadline),
            CloseRequest(crowded.Id, crowdedAt)
        );

        // Assert
        var closedEmpty = AssertClosed(results[0], emptyAt, MailboxDisposedReason.Request);
        var closedSingle = AssertClosed(results[1], singleAt, MailboxDisposedReason.Deadline);
        var closedCrowded = AssertClosed(results[2], crowdedAt, MailboxDisposedReason.Request);

        Assert.Equal(0, closedEmpty.Released.Closed);
        Assert.Equal(1, closedSingle.Released.Closed);
        Assert.Equal(2, closedCrowded.Released.Closed);

        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(parkedOnSingle));
        Assert.Equal(closedSingle.Mailbox.DisposedAt, (await Registration(parkedOnSingle)).ReleasedAt);

        foreach (var receiver in parkedOnCrowded)
        {
            Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));
            Assert.Equal(closedCrowded.Mailbox.DisposedAt, (await Registration(receiver)).ReleasedAt);
        }
    }

    [Fact]
    public async Task BatchClose_MailboxNamedTwiceInOneBatch_ClosesItOnceAndReplaysTheFirstDisposal()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var mailbox = await Mint(repository, "named-twice");
        var receiver = await EnqueueReceiver(repository, mailbox.Id, "r-0");
        var (firstAt, secondAt) = (Now.AddSeconds(-20), Now.AddSeconds(-10));

        // Act: the second request would have been the loser of a row-lock race between two separate calls.
        var results = await BatchClose(
            repository,
            CloseRequest(mailbox.Id, firstAt),
            CloseRequest(mailbox.Id, secondAt, MailboxDisposedReason.Deadline)
        );

        // Assert
        var closed = AssertClosed(results[0], firstAt, MailboxDisposedReason.Request);
        Assert.Equal(1, closed.Released.Closed);

        var replay = Assert.IsType<MailboxCloseResult.AlreadyClosed>(results[1]).Mailbox;
        Assert.Equal(MailboxDisposedReason.Request, replay.DisposedReason);
        Assert.Equal(firstAt, replay.DisposedAt!.Value, TimeSpan.FromMilliseconds(1));

        // Released once, by the request that did the closing.
        Assert.Equal(closed.Mailbox.DisposedAt, (await Registration(receiver)).ReleasedAt);
    }

    [Fact]
    public async Task BatchClose_UnknownIdOrForeignNamespace_IsNotFoundWhileItsBatchMatesClose()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var mailbox = await Mint(repository, "known");
        var unknown = Guid.CreateVersion7();

        // Act: the same mailbox named under two namespaces is two different requests, and only the one naming
        // its own namespace may close it.
        var results = await BatchClose(
            repository,
            CloseRequest(unknown),
            CloseRequest(mailbox.Id, ns: "other-ns"),
            CloseRequest(mailbox.Id),
            CloseRequest(unknown)
        );

        // Assert
        Assert.IsType<MailboxCloseResult.NotFound>(results[0]);
        Assert.IsType<MailboxCloseResult.NotFound>(results[1]);
        Assert.IsType<MailboxCloseResult.Closed>(results[2]);

        // A repeat of a miss is a miss: it inherits the verdict of the request it duplicates.
        Assert.IsType<MailboxCloseResult.NotFound>(results[3]);

        await using var context = fixture.CreateDbContext();
        var row = await context.Mailboxes.SingleAsync(Ct);
        Assert.Equal(MailboxStatus.Disposed, row.Status);
    }

    [Fact]
    public async Task BatchClose_MailboxClosedBeforeTheBatch_ReplaysItsOriginalDisposalWhileItsBatchMatesClose()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var closedEarlier = await Mint(repository, "closed-earlier");
        var stillOpen = await Mint(repository, "still-open");
        var originalAt = Now.AddMinutes(-5);
        Assert.IsType<MailboxCloseResult.Closed>(
            await repository.CloseMailbox(closedEarlier.Id, Ns, MailboxDisposedReason.Deadline, originalAt, Ct)
        );

        // Act
        var results = await BatchClose(
            repository,
            CloseRequest(closedEarlier.Id),
            CloseRequest(stillOpen.Id),
            CloseRequest(closedEarlier.Id)
        );

        // Assert
        void AssertReplaysTheOriginalDisposal(MailboxCloseResult result)
        {
            var already = Assert.IsType<MailboxCloseResult.AlreadyClosed>(result).Mailbox;
            Assert.Equal(MailboxDisposedReason.Deadline, already.DisposedReason);
            Assert.Equal(originalAt, already.DisposedAt!.Value, TimeSpan.FromMilliseconds(1));
        }

        AssertReplaysTheOriginalDisposal(results[0]);
        AssertReplaysTheOriginalDisposal(results[2]);
        Assert.IsType<MailboxCloseResult.Closed>(results[1]);
    }

    [Fact]
    public async Task BatchClose_AndEveryReceiverItReleases_ShareOneTransactionId()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var first = await Mint(repository, "first");
        var second = await Mint(repository, "second");
        var onFirst = await EnqueueReceiver(repository, first.Id, "r-first");
        var onSecond = await EnqueueReceiver(repository, second.Id, "r-second");

        // Act
        var results = await BatchClose(repository, CloseRequest(first.Id), CloseRequest(second.Id));

        // Assert: every row the flush wrote carries one transaction id, across both mailboxes — the whole batch
        // and all of its releases commit together or not at all.
        Assert.All(results, result => Assert.IsType<MailboxCloseResult.Closed>(result));

        var batchTx = await TransactionId("engine.mailboxes", "id", first.Id);
        Assert.Equal(batchTx, await TransactionId("engine.mailboxes", "id", second.Id));
        Assert.Equal(batchTx, await TransactionId("engine.workflows", "id", onFirst));
        Assert.Equal(batchTx, await TransactionId("engine.workflows", "id", onSecond));
        Assert.Equal(batchTx, await TransactionId("engine.mailbox_receivers", "workflow_id", onFirst));
        Assert.Equal(batchTx, await TransactionId("engine.mailbox_receivers", "workflow_id", onSecond));
    }

    [Fact]
    public async Task BatchClose_AFullFlushOfMailboxes_ClosesEveryOne()
    {
        // Arrange: the batch size a buffer flushes at, so the array statements are exercised at the width they
        // run at in production rather than the two elements the plan tests pin.
        var repository = fixture.CreateRepository();
        var mailboxes = new List<MailboxResponse>();
        for (var i = 0; i < 100; i++)
            mailboxes.Add(await Mint(repository, $"flush-{i}"));

        // Act
        var results = await BatchClose(repository, [.. mailboxes.Select(m => CloseRequest(m.Id))]);

        // Assert
        Assert.Equal(100, results.OfType<MailboxCloseResult.Closed>().Count());
        Assert.Equal(
            mailboxes.Select(m => m.Id).Order(),
            results.OfType<MailboxCloseResult.Closed>().Select(c => c.Mailbox.Id).Order()
        );

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.Mailboxes.CountAsync(m => m.Status == MailboxStatus.Open, Ct));
    }

    #endregion

    #region Racing the deadline sweep

    [Fact]
    public async Task BatchClose_AfterTheSweepClosedTheMailbox_ReplaysTheSweepsDisposal()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var swept = await MintOverdue(repository, "swept");
        var receiver = await EnqueueReceiver(repository, swept.Id, "r-swept");
        var untouched = await Mint(repository, "untouched");

        var sweep = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);
        Assert.Equal(1, sweep.Closed);
        Assert.Equal(1, sweep.ReceiversReleased);
        var releasedBySweep = (await Registration(receiver)).ReleasedAt;

        // Act
        var results = await BatchClose(repository, CloseRequest(swept.Id), CloseRequest(untouched.Id));

        // Assert: one disposal survives, and it is the sweep's.
        var already = Assert.IsType<MailboxCloseResult.AlreadyClosed>(results[0]).Mailbox;
        Assert.Equal(MailboxDisposedReason.Deadline, already.DisposedReason);
        Assert.Equal(releasedBySweep, already.DisposedAt);
        Assert.Equal(releasedBySweep, (await Registration(receiver)).ReleasedAt);

        Assert.IsType<MailboxCloseResult.Closed>(results[1]);
    }

    [Fact]
    public async Task BatchClose_BeforeTheSweepReachesTheMailbox_LeavesTheSweepNothingToDo()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var overdue = await MintOverdue(repository, "overdue");
        var receiver = await EnqueueReceiver(repository, overdue.Id, "r-overdue");
        var closedAt = Now;

        var closed = AssertClosed(
            Assert.Single(await BatchClose(repository, CloseRequest(overdue.Id, closedAt))),
            closedAt,
            MailboxDisposedReason.Request
        );
        Assert.Equal(1, closed.Released.Closed);

        // Act
        var sweep = await repository.SweepOverdueMailboxes(Now, batchSize: 100, Ct);

        // Assert
        Assert.Equal(0, sweep.Closed);
        Assert.Equal(0, sweep.Failed);

        var row = await repository.GetMailbox(overdue.Id, Ns, Ct);
        Assert.Equal(MailboxDisposedReason.Request, row!.DisposedReason);
        Assert.Equal(closed.Mailbox.DisposedAt, row.DisposedAt);
        Assert.Equal(closed.Mailbox.DisposedAt, (await Registration(receiver)).ReleasedAt);
    }

    [Fact]
    public async Task BatchClose_RacingTheSweepOverTheSameMailboxes_DisposesEachExactlyOnce()
    {
        // Arrange: every mailbox is both in the batch and claimable by the sweep, so whichever order the two
        // reach a row in, the loser must fold onto the winner's disposal rather than write a second one.
        var closer = fixture.CreateRepository();
        var sweeper = fixture.CreateRepository();
        var mailboxes = new List<MailboxResponse>();
        var receivers = new List<Guid>();
        for (var i = 0; i < 6; i++)
        {
            var mailbox = await MintOverdue(closer, $"contested-{i}");
            mailboxes.Add(mailbox);
            receivers.Add(await EnqueueReceiver(closer, mailbox.Id, $"r-contested-{i}"));
        }

        // Act
        var batch = BatchClose(closer, [.. mailboxes.Select(m => CloseRequest(m.Id))]);
        var sweeping = sweeper.SweepOverdueMailboxes(Now, batchSize: 100, Ct);
        var results = await batch;
        var sweep = await sweeping;

        // Assert: every mailbox disposed once, counted by whichever closure got there first.
        Assert.Equal(0, sweep.Failed);
        Assert.DoesNotContain(results, result => result is MailboxCloseResult.NotFound);
        Assert.Equal(6, results.OfType<MailboxCloseResult.Closed>().Count() + sweep.Closed);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.Mailboxes.CountAsync(m => m.Status == MailboxStatus.Open, Ct));

        // Each receiver released exactly once — by the closure that won its mailbox, and by nobody else.
        Assert.Equal(
            6,
            results.OfType<MailboxCloseResult.Closed>().Sum(closed => closed.Released.Closed) + sweep.ReceiversReleased
        );

        foreach (var receiver in receivers)
        {
            Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));
            Assert.NotNull((await Registration(receiver)).ReleasedAt);
        }
    }

    #endregion

    #region Helpers

    private static DateTimeOffset Now => DateTimeOffset.UtcNow;

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static BufferedMailboxCloseRequest CloseRequest(
        Guid mailboxId,
        DateTimeOffset? now = null,
        MailboxDisposedReason reason = MailboxDisposedReason.Request,
        string ns = Ns
    ) =>
        new(
            mailboxId,
            ns,
            reason,
            now ?? Now,
            TraceContext: null,
            new TaskCompletionSource<MailboxCloseResult>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

    private static BufferedMailboxMintRequest MintRequest(
        string idempotencyKey,
        Guid? mailboxId = null,
        string? collectionKey = null,
        TimeSpan? timeout = null,
        DateTimeOffset? now = null,
        string ns = Ns
    ) =>
        new(
            mailboxId ?? Guid.CreateVersion7(),
            ns,
            idempotencyKey,
            collectionKey,
            timeout ?? TimeSpan.FromHours(1),
            now ?? Now,
            TraceContext: null,
            new TaskCompletionSource<MailboxMintResult>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

    private static Task<MailboxMintResult[]> BatchMint(
        EngineRepository repository,
        params BufferedMailboxMintRequest[] requests
    ) => repository.BatchMintMailboxes(requests, maxOpenPerCollection: 1000, Ct);

    private static Task<MailboxMintResult[]> BatchMint(
        EngineRepository repository,
        int cap,
        params BufferedMailboxMintRequest[] requests
    ) => repository.BatchMintMailboxes(requests, cap, Ct);

    /// <summary>The mailbox a settled mint verdict names, whichever of the two verdicts carrying one it is.</summary>
    private static Guid MailboxIdOf(MailboxMintResult result) =>
        result switch
        {
            MailboxMintResult.Minted minted => minted.Mailbox.Id,
            MailboxMintResult.Existing existing => existing.Mailbox.Id,
            _ => throw new InvalidOperationException($"Unexpected mint result {result}."),
        };

    private static Task<MailboxCloseResult[]> BatchClose(
        EngineRepository repository,
        params BufferedMailboxCloseRequest[] requests
    ) => repository.BatchCloseMailboxes(requests, Ct);

    private static MailboxCloseResult.Closed AssertClosed(
        MailboxCloseResult result,
        DateTimeOffset expectedDisposedAt,
        MailboxDisposedReason expectedReason
    )
    {
        var closed = Assert.IsType<MailboxCloseResult.Closed>(result);
        Assert.Equal(MailboxStatus.Disposed, closed.Mailbox.Status);
        Assert.Equal(expectedReason, closed.Mailbox.DisposedReason);
        Assert.Equal(expectedDisposedAt, closed.Mailbox.DisposedAt!.Value, TimeSpan.FromMilliseconds(1));
        return closed;
    }

    private static async Task<MailboxResponse> Mint(
        EngineRepository repository,
        string key,
        TimeSpan? timeout = null,
        DateTimeOffset? now = null,
        string? collectionKey = null,
        int cap = 1000
    ) =>
        Assert
            .IsType<MailboxMintResult.Minted>(
                await repository.MintMailbox(
                    Guid.CreateVersion7(),
                    Ns,
                    key,
                    collectionKey,
                    timeout ?? TimeSpan.FromHours(1),
                    now ?? Now,
                    cap,
                    Ct
                )
            )
            .Mailbox;

    /// <summary>
    /// Mints a mailbox the deadline sweep will claim: the deadline is derived from the mint instant, so minting
    /// in the past is the only way to produce an overdue one.
    /// </summary>
    private static Task<MailboxResponse> MintOverdue(EngineRepository repository, string key) =>
        Mint(repository, key, TimeSpan.FromMinutes(1), Now.AddDays(-1));

    private static async Task<Guid> EnqueueReceiver(EngineRepository repository, Guid mailboxId, string idempotencyKey)
    {
        var request = new WorkflowRequest
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

        var metadata = new WorkflowRequestMetadata(Ns, idempotencyKey, null, Now, null);
        var results = await repository.BatchEnqueueWorkflows(
            [
                new BufferedEnqueueRequest(
                    new WorkflowEnqueueRequest { Workflows = [request] },
                    metadata,
                    SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyKey)),
                    new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously)
                ),
            ],
            Ct
        );

        return Assert.Single(Assert.Single(results).WorkflowIds!);
    }

    private async Task<PersistentItemStatus> StatusOf(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        return (await context.Workflows.SingleAsync(w => w.Id == workflowId, Ct)).Status;
    }

    private async Task<MailboxReceiverEntity> Registration(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        return await context.MailboxReceivers.SingleAsync(r => r.WorkflowId == workflowId, Ct);
    }

    /// <summary>
    /// The transaction that last wrote a row (<c>xmin</c>): equal ids across rows prove one transaction wrote
    /// them all.
    /// </summary>
    private async Task<string> TransactionId(string table, string column, Guid id)
    {
        await using var conn = new NpgsqlConnection(fixture.ConnectionString);
        await conn.OpenAsync(Ct);

        // The table and column are test-supplied literals naming engine tables, never request data.
#pragma warning disable CA2100
        await using var cmd = new NpgsqlCommand($"SELECT xmin::text FROM {table} WHERE {column} = @id", conn);
#pragma warning restore CA2100
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", id));

        return Assert.IsType<string>(await cmd.ExecuteScalarAsync(Ct));
    }

    #endregion
}
