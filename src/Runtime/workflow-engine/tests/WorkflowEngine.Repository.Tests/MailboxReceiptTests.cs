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
/// Covers the read a receive workflow's first step runs on: its position in the mailbox, and the
/// message standing there or the closure that means none ever will.
/// </summary>
/// <remarks>
/// The property under test is not "the read returns the right row" but that <em>it cannot return a
/// different one later</em>. Delivery existence at a receiver's position is frozen before the receiver
/// can first run, so the tests here deliberately try to move it afterwards — deliver to neighboring
/// positions, close the mailbox underneath a receiver that already has its message, read the same
/// receipt again and again — and assert the answer does not budge. The read is also asserted to write
/// nothing and lock nothing, because a read that recorded its verdict would be a second source of truth
/// able to disagree with the log.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class MailboxReceiptTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "receipt-ns";

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    #region A message stands at the position

    [Fact]
    public async Task Receipt_OfAWokenReceiver_CarriesTheMessageThatWokeIt()
    {
        // Enqueue-first: the receiver parks, the delivery releases it, and what it then reads is the very
        // message whose transaction made it runnable.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Deliver(repository, mailbox.Id, "source-msg-1", payload: """{"status":"confirmed"}""");

        var receipt = await Resolved(repository, receiver);

        Assert.Equal(mailbox.Id, receipt.MailboxId);
        Assert.Equal(0L, receipt.Seq);
        Assert.Null(receipt.DisposedReason);
        Assert.NotNull(receipt.Delivery);
        Assert.Equal("source-msg-1", receipt.Delivery.IdempotencyKey);
        Assert.Equal("""{"status":"confirmed"}""", receipt.Delivery.Payload);

        // It parked, and the receipt says nothing about that. Asserted so the pair with the next test is
        // a real contrast: the two receivers below differ in `held_at` and agree in everything the read
        // produces.
        Assert.NotNull((await Registration(receiver)).HeldAt);
    }

    [Fact]
    public async Task Receipt_OfAReceiverBornOntoABacklogDelivery_CarriesThatMessage()
    {
        // Delivery-first: the message is already sitting at position 0 when the receiver is enqueued, so
        // the receiver is born runnable and never waits for anything.
        //
        // This is the case the receivers registry exists for. Before every receiver registered its
        // position, this one had no `seq` written down anywhere — the read would have found nothing at an
        // unknown position and handed the closing signal to a receiver whose message was in the log. The
        // assertion that `held_at` is null is what makes this test the one that would catch a regression
        // to that shape.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        await Deliver(repository, mailbox.Id, "source-msg-1", payload: """{"status":"confirmed"}""");
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        Assert.Equal(PersistentItemStatus.Enqueued, await StatusOf(receiver));
        Assert.Null((await Registration(receiver)).HeldAt);

        var receipt = await Resolved(repository, receiver);

        Assert.Equal(0L, receipt.Seq);
        Assert.Null(receipt.DisposedReason);
        Assert.Equal("""{"status":"confirmed"}""", Assert.IsType<MailboxDelivery>(receipt.Delivery).Payload);
    }

    [Fact]
    public async Task Receipt_OfEachReceiverInARelay_CarriesTheMessageAtItsOwnPosition()
    {
        // The positions are matched pairwise, not "the next unread message": receiver n reads delivery n.
        // Two receivers and two messages in the same mailbox, deliberately enqueued and delivered
        // interleaved so neither log's order alone could produce the pairing by accident.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var first = await EnqueueReceiver(repository, mailbox.Id, "r0");
        await Deliver(repository, mailbox.Id, "source-msg-1", payload: "first");
        var second = await EnqueueReceiver(repository, mailbox.Id, "r1");
        await Deliver(repository, mailbox.Id, "source-msg-2", payload: "second");

        var firstReceipt = await Resolved(repository, first);
        var secondReceipt = await Resolved(repository, second);

        Assert.Equal(0L, firstReceipt.Seq);
        Assert.Equal("first", Assert.IsType<MailboxDelivery>(firstReceipt.Delivery).Payload);
        Assert.Equal(1L, secondReceipt.Seq);
        Assert.Equal("second", Assert.IsType<MailboxDelivery>(secondReceipt.Delivery).Payload);
    }

    #endregion

    #region No message can ever stand there

    [Fact]
    public async Task Receipt_OfAReceiverReleasedByAClose_IsTheClosingSignalAndSaysWhy()
    {
        // The other of the two releases. Nothing arrived at position 0 and nothing now can, so the read
        // answers with the absence — and with the reason beside it, which is the whole of what the two
        // reasons differ in.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Close(repository, mailbox.Id);

        var receipt = await Resolved(repository, receiver);

        Assert.Equal(mailbox.Id, receipt.MailboxId);
        Assert.Equal(0L, receipt.Seq);
        Assert.Null(receipt.Delivery);
        Assert.Equal(MailboxDisposedReason.Request, receipt.DisposedReason);
    }

    [Fact]
    public async Task Receipt_AfterADeadlineClose_SaysDeadlineRatherThanRequest()
    {
        // The reason is read from the mailbox row the close actually wrote, so the sweep's closures are
        // told apart from a caller's without the read knowing anything about either.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        await Close(repository, mailbox.Id, MailboxDisposedReason.Deadline);

        var receipt = await Resolved(repository, receiver);

        Assert.Null(receipt.Delivery);
        Assert.Equal(MailboxDisposedReason.Deadline, receipt.DisposedReason);
    }

    [Fact]
    public async Task Receipt_OfAReceiverBornOntoAClosedMailbox_IsTheClosingSignal()
    {
        // A receiver enqueued after the exchange ended: accepted, born runnable, and told immediately
        // that nothing is coming. The saga's replayed enqueue lands here and concludes rather than
        // needing an error branch.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        await Close(repository, mailbox.Id);

        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        var receipt = await Resolved(repository, receiver);

        Assert.Null(receipt.Delivery);
        Assert.Equal(MailboxDisposedReason.Request, receipt.DisposedReason);
    }

    [Fact]
    public async Task Receipt_OfAReceiverPastTheLastDeliveredPosition_IsTheClosingSignal()
    {
        // The relay's last hop, which is the ordinary way an exchange ends: the receiver the handler
        // enqueued for the message after the last one gets the closing signal, while the receiver behind
        // it keeps the message it already read. Both answers come out of the same closed mailbox.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var served = await EnqueueReceiver(repository, mailbox.Id, "r0");
        await Deliver(repository, mailbox.Id, "source-msg-1", payload: "the only message");
        var unserved = await EnqueueReceiver(repository, mailbox.Id, "r1");

        await Close(repository, mailbox.Id);

        Assert.Equal(
            "the only message",
            Assert.IsType<MailboxDelivery>((await Resolved(repository, served)).Delivery).Payload
        );

        var receipt = await Resolved(repository, unserved);
        Assert.Equal(1L, receipt.Seq);
        Assert.Null(receipt.Delivery);
        Assert.Equal(MailboxDisposedReason.Request, receipt.DisposedReason);
    }

    #endregion

    #region The answer is frozen

    [Fact]
    public async Task Receipt_IsUnchanged_ByEverythingThatHappensToTheMailboxAfterwards()
    {
        // The frozen-existence rule, exercised against the two things that could plausibly move it: a
        // message landing at a neighboring position, and the mailbox closing underneath a receiver that
        // already has its own. Neither is a hypothetical — both happen on every multi-hop relay — and the
        // point is that re-reading is safe precisely because they cannot reach this position.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id, "r0");
        await EnqueueReceiver(repository, mailbox.Id, "r1");
        await Deliver(repository, mailbox.Id, "source-msg-1", payload: "mine");

        var first = await Resolved(repository, receiver);

        await Deliver(repository, mailbox.Id, "source-msg-2", payload: "not mine");
        var afterNeighbor = await Resolved(repository, receiver);

        await Close(repository, mailbox.Id);
        var afterClose = await Resolved(repository, receiver);

        Assert.Equal(first, afterNeighbor);
        Assert.Equal(first, afterClose);
        Assert.Equal("mine", Assert.IsType<MailboxDelivery>(afterClose.Delivery).Payload);

        // And the closing signal stays a closing signal: a closed mailbox refuses deliveries, so the
        // receiver that was told "nothing is coming" can never be contradicted either.
        Assert.Equal(
            MailboxDeliveryResultKind.Closed,
            KindOf(await Deliver(repository, mailbox.Id, "source-msg-3", payload: "too late"))
        );
    }

    [Fact]
    public async Task Receipt_WritesNothing_NotEvenToTheRowsItReads()
    {
        // "Nothing is written" is the step's defining property and the reason every attempt agrees. Proved
        // by transaction id rather than by re-reading the values: an UPDATE that wrote a column back to
        // the value it already held would leave every field-by-field assertion green and still have made
        // the read a writer.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "source-msg-1", payload: "body");

        var before = await RowVersions(mailbox.Id, receiver);

        Assert.NotNull((await Resolved(repository, receiver)).Delivery);

        Assert.Equal(before, await RowVersions(mailbox.Id, receiver));
    }

    [Fact]
    public async Task Receipt_ReadsStraightThroughAHeldMailboxRowLock()
    {
        // Every mailbox *mutation* takes the mailbox row lock as its first act. This read must not,
        // and that is a claim about behavior rather than about style: a receiver executing while a
        // delivery or a close is mid-flight elsewhere would otherwise stall for the length of that
        // transaction, on a read whose answer that transaction cannot change.
        //
        // The message is already at the position and committed before the row lock is taken elsewhere,
        // so nothing the read looks at is in flight — only the mailbox row is held.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "source-msg-1", payload: "body");

        await using var blocker = new NpgsqlConnection(fixture.ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var tx = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);
        await using (
            var lockCmd = new NpgsqlCommand("SELECT id FROM engine.mailboxes WHERE id = @id FOR UPDATE", blocker, tx)
        )
        {
            lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailbox.Id));
            await lockCmd.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(10));

        var result = await repository.ReadMailboxReceipt(receiver, timeout.Token);

        Assert.NotNull(Assert.IsType<MailboxReceiptResult.Resolved>(result).Receipt.Delivery);

        await tx.RollbackAsync(TestContext.Current.CancellationToken);
    }

    #endregion

    #region States the rendezvous cannot produce

    [Fact]
    public async Task Receipt_OfAWorkflowThatHoldsNoPosition_IsUnregistered()
    {
        // What a resume of a receiver that outlived its mailbox's retention reads. It is not "no message"
        // — the mailbox and its whole log are gone, so nothing can be said about the position at all, and
        // saying "the exchange closed" would be an invention.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);
        await Deliver(repository, mailbox.Id, "source-msg-1", payload: "body");

        await DeleteRegistration(receiver);

        Assert.IsType<MailboxReceiptResult.Unregistered>(
            await repository.ReadMailboxReceipt(receiver, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task Receipt_AtAnUndeliveredPositionOfAnOpenMailbox_IsUndecided()
    {
        // The state the rendezvous makes unreachable, reached the only way it can be: by asking the
        // question out of turn. The receiver below is still `Held` — the assertion says so — so the
        // engine would never run it, and nothing but a direct call can put the read in front of a
        // position whose answer is not yet settled. That is exactly the shape of the bug being guarded
        // against: something made a receiver runnable that neither release had released.
        //
        // Modeled as its own answer rather than folded into "no message" because the two demand
        // opposite responses — one says conclude the exchange, and this one says the engine is wrong
        // about something.
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var receiver = await EnqueueReceiver(repository, mailbox.Id);

        Assert.Equal(PersistentItemStatus.Held, await StatusOf(receiver));

        var undecided = Assert.IsType<MailboxReceiptResult.Undecided>(
            await repository.ReadMailboxReceipt(receiver, TestContext.Current.CancellationToken)
        );

        Assert.Equal(mailbox.Id, undecided.MailboxId);
        Assert.Equal(0L, undecided.Seq);
    }

    #endregion

    #region Helpers

    private static async Task<MailboxReceipt> Resolved(EngineRepository repository, Guid workflowId) =>
        Assert
            .IsType<MailboxReceiptResult.Resolved>(
                await repository.ReadMailboxReceipt(workflowId, TestContext.Current.CancellationToken)
            )
            .Receipt;

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

    private static Task<MailboxDeliveryResult> Deliver(
        EngineRepository repository,
        Guid mailboxId,
        string key,
        string payload
    ) =>
        repository.DeliverToMailbox(
            mailboxId,
            Ns,
            key,
            payload,
            DateTimeOffset.UtcNow,
            maxLogLength: 100,
            TestContext.Current.CancellationToken
        );

    private static Task<MailboxCloseResult> Close(
        EngineRepository repository,
        Guid mailboxId,
        MailboxDisposedReason reason = MailboxDisposedReason.Request
    ) => repository.CloseMailbox(mailboxId, Ns, reason, DateTimeOffset.UtcNow, TestContext.Current.CancellationToken);

    private enum MailboxDeliveryResultKind
    {
        Accepted,
        Duplicate,
        Closed,
        Other,
    }

    private static MailboxDeliveryResultKind KindOf(MailboxDeliveryResult result) =>
        result switch
        {
            MailboxDeliveryResult.Accepted => MailboxDeliveryResultKind.Accepted,
            MailboxDeliveryResult.Duplicate => MailboxDeliveryResultKind.Duplicate,
            MailboxDeliveryResult.Closed => MailboxDeliveryResultKind.Closed,
            _ => MailboxDeliveryResultKind.Other,
        };

    private static async Task<Guid> EnqueueReceiver(
        EngineRepository repository,
        Guid mailboxId,
        string idempotencyKey = "receiver"
    )
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

        var metadata = new WorkflowRequestMetadata(Ns, idempotencyKey, null, DateTimeOffset.UtcNow, null);
        var results = await repository.BatchEnqueueWorkflows(
            [
                new BufferedEnqueueRequest(
                    new WorkflowEnqueueRequest { Workflows = [request] },
                    metadata,
                    SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyKey)),
                    new TaskCompletionSource<WorkflowEnqueueOutcome>(TaskCreationOptions.RunContinuationsAsynchronously)
                ),
            ],
            TestContext.Current.CancellationToken
        );

        return Assert.Single(Assert.Single(results).WorkflowIds!);
    }

    private async Task<PersistentItemStatus> StatusOf(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        var workflow = await context.Workflows.SingleAsync(
            w => w.Id == workflowId,
            TestContext.Current.CancellationToken
        );
        return workflow.Status;
    }

    private async Task<MailboxReceiverEntity> Registration(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        return await context.MailboxReceivers.SingleAsync(
            r => r.WorkflowId == workflowId,
            TestContext.Current.CancellationToken
        );
    }

    /// <summary>
    /// Stands in for retention having purged the mailbox out from under a receive workflow that outlived
    /// it — the one reachable way a receiver ends up holding no position.
    /// </summary>
    private async Task DeleteRegistration(Guid workflowId)
    {
        await using var context = fixture.CreateDbContext();
        await context.Database.ExecuteSqlAsync(
            $"DELETE FROM engine.mailbox_receivers WHERE workflow_id = {workflowId}",
            TestContext.Current.CancellationToken
        );
    }

    /// <summary>
    /// The transaction ids that last wrote each of the three rows the read touches. Any write by the read
    /// — including one that stores a value back unchanged — advances the row's <c>xmin</c>.
    /// </summary>
    private async Task<string> RowVersions(Guid mailboxId, Guid workflowId)
    {
        await using var conn = new NpgsqlConnection(fixture.ConnectionString);
        await conn.OpenAsync(TestContext.Current.CancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT (SELECT m.xmin::text FROM engine.mailboxes m WHERE m.id = @mailbox_id)
                || '/' || (SELECT r.xmin::text FROM engine.mailbox_receivers r WHERE r.workflow_id = @workflow_id)
                || '/' || coalesce((SELECT d.xmin::text FROM engine.mailbox_deliveries d WHERE d.mailbox_id = @mailbox_id AND d.idx = 0), '-')
            """,
            conn
        );
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("mailbox_id", mailboxId));
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("workflow_id", workflowId));

        return Assert.IsType<string>(await cmd.ExecuteScalarAsync(TestContext.Current.CancellationToken));
    }

    #endregion
}
