using Microsoft.EntityFrameworkCore;
using Npgsql;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Covers delivery ingestion against a real database: the gapless log, the idempotency rule and the
/// order it is applied in, the refusals, and the schema that backs all three.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class MailboxDeliveryTests(PostgresFixture fixture) : IAsyncLifetime
{
    private const string Ns = "test-ns";
    private const int LogCap = 100;

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static async Task<MailboxResponse> MintMailbox(EngineRepository repository, string key = "mailbox-key")
    {
        var result = await repository.MintMailbox(
            Guid.CreateVersion7(),
            Ns,
            key,
            collectionKey: null,
            TimeSpan.FromHours(1),
            DateTimeOffset.UtcNow,
            maxOpenPerCollection: 100,
            TestContext.Current.CancellationToken
        );

        return Assert.IsType<MailboxMintResult.Minted>(result).Mailbox;
    }

    private static Task<MailboxDeliveryResult> Deliver(
        EngineRepository repository,
        Guid mailboxId,
        string key,
        string payload = "{}",
        DateTimeOffset? now = null,
        int logCap = LogCap,
        string ns = Ns
    ) =>
        repository.DeliverToMailbox(
            mailboxId,
            ns,
            key,
            payload,
            now ?? DateTimeOffset.UtcNow,
            logCap,
            TestContext.Current.CancellationToken
        );

    private static MailboxDeliveryResponse AssertAccepted(MailboxDeliveryResult result) =>
        Assert.IsType<MailboxDeliveryResult.Accepted>(result).Delivery;

    #region The gapless log

    [Fact]
    public async Task DeliverToMailbox_OpenMailbox_AppendsAtTheNextPositionAndAdvancesTheCounter()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var now = DateTimeOffset.UtcNow;

        var first = AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1", """{"a":1}""", now));
        var second = AssertAccepted(await Deliver(repository, mailbox.Id, "msg-2", """{"a":2}""", now));

        Assert.Equal(0L, first.Idx);
        Assert.Equal(1L, second.Idx);
        Assert.Equal(mailbox.Id, first.MailboxId);
        Assert.Equal("msg-1", first.IdempotencyKey);
        Assert.Equal(now, first.AcceptedAt, TimeSpan.FromMilliseconds(1));

        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.NotNull(afterwards);
        Assert.Equal(2L, afterwards.NextIdx);
        Assert.Equal(0L, afterwards.NextSeq);
    }

    [Fact]
    public async Task DeliverToMailbox_StoresThePayloadVerbatim()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        const string Payload = """  {"æøå": "  spaced  ", "n": 1.500}  """;

        var accepted = AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1", Payload));

        await using var context = fixture.CreateDbContext();
        var row = await context.MailboxDeliveries.SingleAsync(
            d => d.MailboxId == mailbox.Id && d.Idx == accepted.Idx,
            TestContext.Current.CancellationToken
        );
        Assert.Equal(Payload, row.Payload);
    }

    [Fact]
    public async Task DeliverToMailbox_EmptyPayload_IsAccepted()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var accepted = AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1", payload: ""));

        Assert.Equal(0L, accepted.Idx);
    }

    [Fact]
    public async Task DeliverToMailbox_ConcurrentDeliveries_AssignEveryPositionExactlyOnce()
    {
        const int Count = 16;
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var results = await Task.WhenAll(
            Enumerable.Range(0, Count).Select(i => Deliver(repository, mailbox.Id, $"msg-{i}"))
        );

        var positions = results.Select(AssertAccepted).Select(d => d.Idx).Order().ToArray();
        Assert.Equal(Enumerable.Range(0, Count).Select(i => (long)i), positions);

        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.NotNull(afterwards);
        Assert.Equal((long)Count, afterwards.NextIdx);
    }

    #endregion

    #region Idempotency — accepted versus kept

    [Fact]
    public async Task DeliverToMailbox_ReplayedKey_ReturnsTheOriginalDeliveryAndAppendsNothing()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var accepted = AssertAccepted(
            await Deliver(repository, mailbox.Id, "msg-1", """{"v":1}""", DateTimeOffset.UtcNow.AddMinutes(-5))
        );

        var replay = await Deliver(repository, mailbox.Id, "msg-1", """{"v":2}""", DateTimeOffset.UtcNow);

        var duplicate = Assert.IsType<MailboxDeliveryResult.Duplicate>(replay).Delivery;
        Assert.Equal(accepted.Idx, duplicate.Idx);
        Assert.Equal(accepted.AcceptedAt, duplicate.AcceptedAt);

        await using var context = fixture.CreateDbContext();
        var row = await context.MailboxDeliveries.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal("""{"v":1}""", row.Payload);

        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.NotNull(afterwards);
        Assert.Equal(1L, afterwards.NextIdx);
    }

    [Fact]
    public async Task DeliverToMailbox_ReplayedKeyAfterTheMailboxClosed_StillReplaysTheDelivery()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var accepted = AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1"));
        await repository.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Request,
            DateTimeOffset.UtcNow,
            TestContext.Current.CancellationToken
        );

        var replay = await Deliver(repository, mailbox.Id, "msg-1");

        var duplicate = Assert.IsType<MailboxDeliveryResult.Duplicate>(replay).Delivery;
        Assert.Equal(accepted.Idx, duplicate.Idx);
    }

    [Fact]
    public async Task DeliverToMailbox_ReplayedKeyOnAFullLog_StillReplaysTheDelivery()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var accepted = AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1", logCap: 1));

        var replay = await Deliver(repository, mailbox.Id, "msg-1", logCap: 1);

        var duplicate = Assert.IsType<MailboxDeliveryResult.Duplicate>(replay).Delivery;
        Assert.Equal(accepted.Idx, duplicate.Idx);
    }

    [Fact]
    public async Task DeliverToMailbox_SameKeyConcurrently_AppendsExactlyOneDelivery()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        var results = await Task.WhenAll(
            Enumerable.Range(0, 8).Select(_ => Deliver(repository, mailbox.Id, "contested"))
        );

        Assert.Single(results.OfType<MailboxDeliveryResult.Accepted>());

        var positions = results
            .Select(r =>
                r switch
                {
                    MailboxDeliveryResult.Accepted a => a.Delivery.Idx,
                    MailboxDeliveryResult.Duplicate d => d.Delivery.Idx,
                    _ => throw new InvalidOperationException($"Unexpected delivery result {r}."),
                }
            )
            .Distinct()
            .ToList();
        Assert.Equal([0L], positions);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(1, await context.MailboxDeliveries.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task DeliverToMailbox_KeysAreScopedToOneMailbox()
    {
        var repository = fixture.CreateRepository();
        var first = await MintMailbox(repository, "mailbox-a");
        var second = await MintMailbox(repository, "mailbox-b");

        var a = AssertAccepted(await Deliver(repository, first.Id, "msg-1"));
        var b = AssertAccepted(await Deliver(repository, second.Id, "msg-1"));

        Assert.Equal(0L, a.Idx);
        Assert.Equal(0L, b.Idx);
        Assert.NotEqual(a.MailboxId, b.MailboxId);
    }

    #endregion

    #region Refusals

    [Fact]
    public async Task DeliverToMailbox_ClosedMailbox_IsRefusedAndWritesNothing()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var closedAt = DateTimeOffset.UtcNow;
        await repository.CloseMailbox(
            mailbox.Id,
            Ns,
            MailboxDisposedReason.Deadline,
            closedAt,
            TestContext.Current.CancellationToken
        );

        var refused = await Deliver(repository, mailbox.Id, "msg-1");

        var closed = Assert.IsType<MailboxDeliveryResult.Closed>(refused).Mailbox;
        Assert.Equal(MailboxStatus.Disposed, closed.Status);
        Assert.Equal(MailboxDisposedReason.Deadline, closed.DisposedReason);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxDeliveries.CountAsync(TestContext.Current.CancellationToken));

        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.NotNull(afterwards);
        Assert.Equal(0L, afterwards.NextIdx);
    }

    [Fact]
    public async Task DeliverToMailbox_LogAtItsCap_IsRefusedAndWritesNothing()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        for (int i = 0; i < 3; i++)
            AssertAccepted(await Deliver(repository, mailbox.Id, $"msg-{i}", logCap: 3));

        var refused = await Deliver(repository, mailbox.Id, "msg-3", logCap: 3);

        Assert.Equal(3L, Assert.IsType<MailboxDeliveryResult.LogFull>(refused).LogLength);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(3, await context.MailboxDeliveries.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task DeliverToMailbox_RefusedDelivery_LeavesItsIdempotencyKeyFree()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        AssertAccepted(await Deliver(repository, mailbox.Id, "msg-0", logCap: 1));
        Assert.IsType<MailboxDeliveryResult.LogFull>(await Deliver(repository, mailbox.Id, "msg-1", logCap: 1));

        var accepted = AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1", logCap: 5));

        Assert.Equal(1L, accepted.Idx);
    }

    [Fact]
    public async Task DeliverToMailbox_RefusalRepeats()
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

        Assert.IsType<MailboxDeliveryResult.Closed>(await Deliver(repository, mailbox.Id, "msg-1"));
        Assert.IsType<MailboxDeliveryResult.Closed>(await Deliver(repository, mailbox.Id, "msg-1"));

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxDeliveries.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task DeliverToMailbox_UnknownIdOrForeignNamespace_ReturnsNotFound()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        Assert.IsType<MailboxDeliveryResult.NotFound>(await Deliver(repository, Guid.CreateVersion7(), "msg-1"));
        Assert.IsType<MailboxDeliveryResult.NotFound>(await Deliver(repository, mailbox.Id, "msg-1", ns: "other-ns"));

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxDeliveries.CountAsync(TestContext.Current.CancellationToken));
    }

    #endregion

    #region The mailbox row is the serialization point

    [Fact]
    public async Task DeliverToMailbox_CannotEvenReplayADeliveryWhileTheMailboxRowLockIsHeldElsewhere()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        var accepted = AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1"));

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

        var replay = Deliver(repository, mailbox.Id, "msg-1");

        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(
            replay.IsCompleted,
            "DeliverToMailbox answered a replay while the mailbox row lock was held, so it decided before locking."
        );

        await blockingTx.RollbackAsync(TestContext.Current.CancellationToken);

        var duplicate = Assert.IsType<MailboxDeliveryResult.Duplicate>(await replay).Delivery;
        Assert.Equal(accepted.Idx, duplicate.Idx);
    }

    [Fact]
    public async Task DeliverToMailbox_RacingAClose_IsSerializedByTheMailboxRowLock()
    {
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

        var delivery = Deliver(repository, mailbox.Id, "msg-1");
        await Task.Delay(TimeSpan.FromMilliseconds(500), TestContext.Current.CancellationToken);
        Assert.False(delivery.IsCompleted, "The delivery decided its outcome while the close held the row lock.");

        await closingTx.CommitAsync(TestContext.Current.CancellationToken);

        Assert.IsType<MailboxDeliveryResult.Closed>(await delivery);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.MailboxDeliveries.CountAsync(TestContext.Current.CancellationToken));
    }

    #endregion

    #region Schema

    [Fact]
    public async Task DeliveryPositions_AreUniquePerMailbox()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1"));

        await using var context = fixture.CreateDbContext();
        var collision = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync(
                $"""
                INSERT INTO engine.mailbox_deliveries (mailbox_id, idx, idempotency_key, payload, accepted_at)
                VALUES ({mailbox.Id}, 0, 'other-key', 'x', now())
                """,
                TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(PostgresErrorCodes.UniqueViolation, collision.SqlState);
        Assert.Contains("pk_mailbox_deliveries", collision.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task DeliveryKeys_AreUniquePerMailbox()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1"));

        await using var context = fixture.CreateDbContext();
        var collision = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync(
                $"""
                INSERT INTO engine.mailbox_deliveries (mailbox_id, idx, idempotency_key, payload, accepted_at)
                VALUES ({mailbox.Id}, 1, 'msg-1', 'x', now())
                """,
                TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(PostgresErrorCodes.UniqueViolation, collision.SqlState);
        Assert.Contains(
            "ix_mailbox_deliveries_mailbox_id_idempotency_key",
            collision.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task Deliveries_CannotOutliveOrPrecedeTheirMailbox()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);
        AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1"));

        await using var context = fixture.CreateDbContext();

        var orphan = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync(
                $"""
                INSERT INTO engine.mailbox_deliveries (mailbox_id, idx, idempotency_key, payload, accepted_at)
                VALUES ({Guid.CreateVersion7()}, 0, 'msg-1', 'x', now())
                """,
                TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, orphan.SqlState);

        var orphaning = await Assert.ThrowsAsync<PostgresException>(async () =>
            await context.Database.ExecuteSqlAsync(
                $"DELETE FROM engine.mailboxes WHERE id = {mailbox.Id}",
                TestContext.Current.CancellationToken
            )
        );
        Assert.Equal(PostgresErrorCodes.RestrictViolation, orphaning.SqlState);
        Assert.Contains("fk_mailbox_deliveries_mailboxes_mailbox_id", orphaning.Message, StringComparison.Ordinal);
    }

    #endregion

    #region The unpaired count

    [Fact]
    public async Task UnpairedDeliveries_MatchesTheDeliveriesNoReceiverCouldHaveRead()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        await using var context = fixture.CreateDbContext();

        for (int i = 1; i <= 4; i++)
        {
            AssertAccepted(await Deliver(repository, mailbox.Id, $"msg-{i}"));

            var read = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
            Assert.NotNull(read);

            var rows = await context.MailboxDeliveries.CountAsync(
                d => d.MailboxId == mailbox.Id,
                TestContext.Current.CancellationToken
            );
            Assert.Equal(i, rows);
            Assert.Equal((long)rows, read.UnpairedDeliveries);
            Assert.Equal((long)rows, read.NextIdx);
        }

        Assert.IsType<MailboxDeliveryResult.Duplicate>(await Deliver(repository, mailbox.Id, "msg-1"));

        var afterReplay = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.NotNull(afterReplay);
        Assert.Equal(4L, afterReplay.UnpairedDeliveries);
    }

    #endregion

    #region Gaps later steps close

    [Fact]
    public async Task AcceptedDelivery_SitsAtItsPositionAndWakesNobody()
    {
        var repository = fixture.CreateRepository();
        var mailbox = await MintMailbox(repository);

        AssertAccepted(await Deliver(repository, mailbox.Id, "msg-1"));

        var afterwards = await repository.GetMailbox(mailbox.Id, Ns, TestContext.Current.CancellationToken);
        Assert.NotNull(afterwards);
        Assert.Equal(1L, afterwards.NextIdx);
        Assert.Equal(0L, afterwards.NextSeq);
        Assert.Equal(1L, afterwards.UnpairedDeliveries);

        await using var context = fixture.CreateDbContext();
        Assert.Equal(0, await context.Workflows.CountAsync(TestContext.Current.CancellationToken));
    }

    #endregion
}
