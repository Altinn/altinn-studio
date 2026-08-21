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

    #region Delivering a batch

    [Fact]
    public async Task BatchDeliver_MessagesForSeveralMailboxes_TakeConsecutivePositionsInBatchOrder()
    {
        // Arrange: two mailboxes, and one batch whose messages for them are interleaved — each mailbox's
        // positions are its own run, so a batch counting positions per flush rather than per mailbox would
        // hand out something else.
        var repository = fixture.CreateRepository();
        var first = await Mint(repository, "first");
        var second = await Mint(repository, "second");

        // Act
        var results = await BatchDeliver(
            repository,
            DeliveryRequest(first.Id, "f-0"),
            DeliveryRequest(second.Id, "s-0"),
            DeliveryRequest(first.Id, "f-1"),
            DeliveryRequest(second.Id, "s-1"),
            DeliveryRequest(first.Id, "f-2")
        );

        // Assert
        Assert.Equal(0, AssertAccepted(results[0]).Idx);
        Assert.Equal(0, AssertAccepted(results[1]).Idx);
        Assert.Equal(1, AssertAccepted(results[2]).Idx);
        Assert.Equal(1, AssertAccepted(results[3]).Idx);
        Assert.Equal(2, AssertAccepted(results[4]).Idx);

        // Gapless, and in arrival order: the log reads back the way the batch was handed over.
        Assert.Equal(["f-0", "f-1", "f-2"], await LogOf(first.Id));
        Assert.Equal(["s-0", "s-1"], await LogOf(second.Id));
    }

    [Fact]
    public async Task BatchDeliver_KeyNamedTwiceInOneBatch_AppendsOneMessageAndReplaysItsPosition()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var mailbox = await Mint(repository, "named-twice");

        // Act: the third request would have been the loser of the row-lock race between two separate calls,
        // reading the first one's message rather than appending a second.
        var results = await BatchDeliver(
            repository,
            DeliveryRequest(mailbox.Id, "dup", payload: """{"attempt":1}"""),
            DeliveryRequest(mailbox.Id, "other"),
            DeliveryRequest(mailbox.Id, "dup", payload: """{"attempt":2}""")
        );

        // Assert
        var appended = AssertAccepted(results[0]);
        Assert.Equal(0, appended.Idx);
        Assert.Equal(1, AssertAccepted(results[1]).Idx);

        var replay = Assert.IsType<MailboxDeliveryResult.Duplicate>(results[2]).Delivery;
        Assert.Equal(appended.Idx, replay.Idx);
        Assert.Equal(appended.AcceptedAt, replay.AcceptedAt);

        // One row, holding the first occurrence's payload: the repeat wrote nothing at all.
        Assert.Equal(["dup", "other"], await LogOf(mailbox.Id));
        await using var context = fixture.CreateDbContext();
        var stored = await context.MailboxDeliveries.SingleAsync(d => d.IdempotencyKey == "dup", Ct);
        Assert.Equal("""{"attempt":1}""", stored.Payload);
        Assert.Equal(2, await NextIdxOf(mailbox.Id));
    }

    [Fact]
    public async Task BatchDeliver_ReplayedKeyOnAMailboxThatClosedOrFilled_ReplaysTheMessageRatherThanRefusingIt()
    {
        // Arrange: two mailboxes each already holding one message — one since closed, one at the log cap this
        // batch runs under.
        var repository = fixture.CreateRepository();
        var closed = await Mint(repository, "closed");
        var full = await Mint(repository, "full");
        var keptOnClosed = AssertAccepted(
            Assert.Single(await BatchDeliver(repository, DeliveryRequest(closed.Id, "c-kept")))
        );
        var keptOnFull = AssertAccepted(
            Assert.Single(await BatchDeliver(repository, DeliveryRequest(full.Id, "f-kept")))
        );
        Assert.IsType<MailboxCloseResult.Closed>(
            await repository.CloseMailbox(closed.Id, Ns, MailboxDisposedReason.Request, Now, Ct)
        );

        // Act
        var results = await BatchDeliver(
            repository,
            logCap: 1,
            DeliveryRequest(closed.Id, "c-kept"),
            DeliveryRequest(closed.Id, "c-fresh"),
            DeliveryRequest(full.Id, "f-kept"),
            DeliveryRequest(full.Id, "f-fresh")
        );

        // Assert: the lookup runs before either refusal, so what the log holds keeps replaying — reporting a
        // refusal for a message sitting there waiting to be read would have a forwarder dead-letter it.
        var replayedOnClosed = Assert.IsType<MailboxDeliveryResult.Duplicate>(results[0]).Delivery;
        Assert.Equal(keptOnClosed.Idx, replayedOnClosed.Idx);
        Assert.Equal(keptOnClosed.AcceptedAt, replayedOnClosed.AcceptedAt);

        var replayedOnFull = Assert.IsType<MailboxDeliveryResult.Duplicate>(results[2]).Delivery;
        Assert.Equal(keptOnFull.Idx, replayedOnFull.Idx);

        // The fresh keys are refused, and closure outranks the log cap: the closed mailbox is equally full.
        Assert.Equal(
            MailboxDisposedReason.Request,
            Assert.IsType<MailboxDeliveryResult.Closed>(results[1]).Mailbox.DisposedReason
        );
        Assert.Equal(1, Assert.IsType<MailboxDeliveryResult.LogFull>(results[3]).LogLength);

        Assert.Equal(["c-kept"], await LogOf(closed.Id));
        Assert.Equal(["f-kept"], await LogOf(full.Id));
    }

    [Fact]
    public async Task BatchDeliver_RefusedAndMissingRequests_WriteNothingWhileTheirBatchMatesAreAppended()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var open = await Mint(repository, "open");
        var closed = await Mint(repository, "closed");
        Assert.IsType<MailboxCloseResult.Closed>(
            await repository.CloseMailbox(closed.Id, Ns, MailboxDisposedReason.Deadline, Now, Ct)
        );
        var unknown = Guid.CreateVersion7();

        // Act: the fourth request names the open mailbox's id and the third request's key, but a namespace the
        // mailbox does not live in — two requests, not a request and its repeat.
        var results = await BatchDeliver(
            repository,
            DeliveryRequest(unknown, "u-0"),
            DeliveryRequest(closed.Id, "c-0"),
            DeliveryRequest(open.Id, "o-0"),
            DeliveryRequest(open.Id, "o-0", ns: "other-ns"),
            DeliveryRequest(open.Id, "o-1")
        );

        // Assert
        Assert.IsType<MailboxDeliveryResult.NotFound>(results[0]);
        Assert.IsType<MailboxDeliveryResult.Closed>(results[1]);
        Assert.Equal(0, AssertAccepted(results[2]).Idx);
        Assert.IsType<MailboxDeliveryResult.NotFound>(results[3]);
        Assert.Equal(1, AssertAccepted(results[4]).Idx);

        // Only the accepted pair is on disk, and the refusals took no position from the mailbox they named.
        Assert.Equal(["o-0", "o-1"], await LogOf(open.Id));
        Assert.Empty(await LogOf(closed.Id));
        Assert.Equal(0, await NextIdxOf(closed.Id));
    }

    [Fact]
    public async Task BatchDeliver_LogFilledPartwayThroughTheBatch_RefusesTheOverflowAndLeavesItsKeysFree()
    {
        // Arrange
        var repository = fixture.CreateRepository();
        var mailbox = await Mint(repository, "filling-up");

        // Act
        var results = await BatchDeliver(
            repository,
            logCap: 2,
            DeliveryRequest(mailbox.Id, "k-0"),
            DeliveryRequest(mailbox.Id, "k-1"),
            DeliveryRequest(mailbox.Id, "k-2"),
            DeliveryRequest(mailbox.Id, "k-3")
        );

        // Assert: the message that fills the log is accepted and the ones behind it are not — the verdicts four
        // separate calls would have had, because the cap binds against the position each request would take.
        Assert.Equal(0, AssertAccepted(results[0]).Idx);
        Assert.Equal(1, AssertAccepted(results[1]).Idx);
        Assert.Equal(2, Assert.IsType<MailboxDeliveryResult.LogFull>(results[2]).LogLength);
        Assert.Equal(2, Assert.IsType<MailboxDeliveryResult.LogFull>(results[3]).LogLength);

        Assert.Equal(["k-0", "k-1"], await LogOf(mailbox.Id));
        Assert.Equal(2, await NextIdxOf(mailbox.Id));

        // A refusal stores nothing, so its key is still the caller's to use once the reason is gone.
        var retried = await BatchDeliver(
            repository,
            logCap: 4,
            DeliveryRequest(mailbox.Id, "k-2"),
            DeliveryRequest(mailbox.Id, "k-3")
        );

        Assert.Equal(2, AssertAccepted(retried[0]).Idx);
        Assert.Equal(3, AssertAccepted(retried[1]).Idx);
    }

    [Fact]
    public async Task BatchDeliver_Counters_AdvanceByExactlyTheMessagesAppended()
    {
        // Arrange: a mailbox already holding one message and one parked receiver, so both counters start
        // nonzero and the delivery counter is the only one this batch may move.
        var repository = fixture.CreateRepository();
        var appending = await Mint(repository, "appending");
        var refusing = await Mint(repository, "refusing");
        AssertAccepted(Assert.Single(await BatchDeliver(repository, DeliveryRequest(appending.Id, "kept"))));
        await EnqueueReceiver(repository, appending.Id, "r-appending");
        Assert.IsType<MailboxCloseResult.Closed>(
            await repository.CloseMailbox(refusing.Id, Ns, MailboxDisposedReason.Request, Now, Ct)
        );

        // Act: five requests, three of which append.
        var results = await BatchDeliver(
            repository,
            DeliveryRequest(appending.Id, "kept"),
            DeliveryRequest(appending.Id, "fresh-0"),
            DeliveryRequest(refusing.Id, "refused"),
            DeliveryRequest(appending.Id, "fresh-1"),
            DeliveryRequest(appending.Id, "fresh-2")
        );

        // Assert
        Assert.IsType<MailboxDeliveryResult.Duplicate>(results[0]);
        Assert.IsType<MailboxDeliveryResult.Closed>(results[2]);

        // Three appends, three positions: the counter is bumped by exactly the rows inserted, and neither the
        // replay nor the refusal costs a position.
        Assert.Equal(4, await NextIdxOf(appending.Id));
        Assert.Equal(4, (await LogOf(appending.Id)).Count);
        Assert.Equal(0, await NextIdxOf(refusing.Id));

        // The receivers counter is not the delivery counter: a delivery never moves it.
        await using var context = fixture.CreateDbContext();
        Assert.Equal(1, (await context.Mailboxes.SingleAsync(m => m.Id == appending.Id, Ct)).NextSeq);
    }

    [Fact]
    public async Task BatchDeliver_AndEveryReceiverItWakes_ShareOneTransactionId()
    {
        // Arrange: two mailboxes with a receiver parked at position 0 and one with nobody waiting.
        var repository = fixture.CreateRepository();
        var first = await Mint(repository, "first");
        var second = await Mint(repository, "second");
        var nobody = await Mint(repository, "nobody");
        var onFirst = await EnqueueReceiver(repository, first.Id, "r-first");
        var onSecond = await EnqueueReceiver(repository, second.Id, "r-second");

        // Act
        var results = await BatchDeliver(
            repository,
            DeliveryRequest(first.Id, "f-0"),
            DeliveryRequest(second.Id, "s-0"),
            DeliveryRequest(nobody.Id, "n-0")
        );

        // Assert
        Assert.True(Assert.IsType<MailboxDeliveryResult.Accepted>(results[0]).ReleasedReceiver);
        Assert.True(Assert.IsType<MailboxDeliveryResult.Accepted>(results[1]).ReleasedReceiver);
        Assert.False(Assert.IsType<MailboxDeliveryResult.Accepted>(results[2]).ReleasedReceiver);

        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(onFirst));
        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(onSecond));

        // Every row the flush wrote carries one transaction id, across all three mailboxes: the appends and the
        // wakes they caused commit together or not at all. A held receiver has no timer, so a wake that could
        // commit separately from its message would park it until the mailbox's deadline.
        var batchTx = await TransactionId("engine.mailboxes", "id", first.Id);
        Assert.Equal(batchTx, await TransactionId("engine.mailboxes", "id", second.Id));
        Assert.Equal(batchTx, await TransactionId("engine.mailboxes", "id", nobody.Id));
        Assert.Equal(batchTx, await TransactionId("engine.mailbox_deliveries", "mailbox_id", first.Id));
        Assert.Equal(batchTx, await TransactionId("engine.mailbox_deliveries", "mailbox_id", second.Id));
        Assert.Equal(batchTx, await TransactionId("engine.mailbox_deliveries", "mailbox_id", nobody.Id));
        Assert.Equal(batchTx, await TransactionId("engine.workflows", "id", onFirst));
        Assert.Equal(batchTx, await TransactionId("engine.workflows", "id", onSecond));
        Assert.Equal(batchTx, await TransactionId("engine.mailbox_receivers", "workflow_id", onFirst));
        Assert.Equal(batchTx, await TransactionId("engine.mailbox_receivers", "workflow_id", onSecond));
    }

    [Fact]
    public async Task BatchDeliver_ConcurrentBatchesOverOneMailbox_AssignEveryPositionExactlyOnce()
    {
        // Arrange: eight flushes of five messages each, all into one mailbox — the convoy on its row lock that
        // a single-mailbox storm becomes.
        const int flushes = 8;
        const int perFlush = 5;
        var mailbox = await Mint(fixture.CreateRepository(), "contested");
        var repositories = Enumerable.Range(0, flushes).Select(_ => fixture.CreateRepository()).ToArray();

        // Act
        var results = await Task.WhenAll(
            repositories.Select(
                (repository, flush) =>
                    BatchDeliver(
                        repository,
                        [
                            .. Enumerable
                                .Range(0, perFlush)
                                .Select(i => DeliveryRequest(mailbox.Id, $"flush-{flush}-msg-{i}")),
                        ]
                    )
            )
        );

        // Assert: every position handed out exactly once, and no position skipped — the log is gapless however
        // the flushes interleaved.
        var positions = results.SelectMany(batch => batch).Select(result => AssertAccepted(result).Idx).ToArray();
        Assert.Equal(Enumerable.Range(0, flushes * perFlush).Select(i => (long)i), positions.Order());
        Assert.Equal(flushes * perFlush, (await LogOf(mailbox.Id)).Count);
        Assert.Equal(flushes * perFlush, await NextIdxOf(mailbox.Id));

        // And each flush's own positions are a contiguous run: it holds the mailbox row lock from its first
        // append to its commit, so no other flush can take a position in the middle of its range.
        foreach (var batch in results)
        {
            var run = batch.Select(result => AssertAccepted(result).Idx).Order().ToArray();
            Assert.Equal(run[0] + perFlush - 1, run[^1]);
        }
    }

    [Fact]
    public async Task BatchDeliver_AFullFlushOfMessages_AppendsEveryOne()
    {
        // Arrange: the batch size a buffer flushes at, so the array statements are exercised at the width they
        // run at in production rather than the handful the other tests name — spread over four mailboxes, so
        // the per-mailbox position runs are interleaved throughout.
        var repository = fixture.CreateRepository();
        var mailboxes = new List<MailboxResponse>();
        for (var i = 0; i < 4; i++)
            mailboxes.Add(await Mint(repository, $"flush-target-{i}"));

        var requests = Enumerable.Range(0, 100).Select(i => DeliveryRequest(mailboxes[i % 4].Id, $"msg-{i}")).ToArray();

        // Act
        var results = await BatchDeliver(repository, requests);

        // Assert
        Assert.Equal(100, results.Length);
        Assert.All(results, result => AssertAccepted(result));

        foreach (var (mailbox, index) in mailboxes.Select((mailbox, index) => (mailbox, index)))
        {
            Assert.Equal([.. Enumerable.Range(0, 25).Select(i => $"msg-{(i * 4) + index}")], await LogOf(mailbox.Id));
            Assert.Equal(25, await NextIdxOf(mailbox.Id));
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

    private static BufferedMailboxDeliveryRequest DeliveryRequest(
        Guid mailboxId,
        string idempotencyKey,
        string payload = "{}",
        DateTimeOffset? now = null,
        string ns = Ns
    ) =>
        new(
            mailboxId,
            ns,
            idempotencyKey,
            payload,
            now ?? Now,
            TraceContext: null,
            new TaskCompletionSource<MailboxDeliveryResult>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

    private static Task<MailboxDeliveryResult[]> BatchDeliver(
        EngineRepository repository,
        params BufferedMailboxDeliveryRequest[] requests
    ) => repository.BatchDeliverToMailboxes(requests, maxLogLength: 1000, Ct);

    private static Task<MailboxDeliveryResult[]> BatchDeliver(
        EngineRepository repository,
        int logCap,
        params BufferedMailboxDeliveryRequest[] requests
    ) => repository.BatchDeliverToMailboxes(requests, logCap, Ct);

    private static MailboxDeliveryResponse AssertAccepted(MailboxDeliveryResult result) =>
        Assert.IsType<MailboxDeliveryResult.Accepted>(result).Delivery;

    /// <summary>The keys a mailbox's log holds, position by position — the gapless order it is read in.</summary>
    private async Task<List<string>> LogOf(Guid mailboxId)
    {
        await using var context = fixture.CreateDbContext();
        return await context
            .MailboxDeliveries.Where(delivery => delivery.MailboxId == mailboxId)
            .OrderBy(delivery => delivery.Idx)
            .Select(delivery => delivery.IdempotencyKey)
            .ToListAsync(Ct);
    }

    private async Task<long> NextIdxOf(Guid mailboxId)
    {
        await using var context = fixture.CreateDbContext();
        return (await context.Mailboxes.SingleAsync(mailbox => mailbox.Id == mailboxId, Ct)).NextIdx;
    }

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
