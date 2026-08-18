using Npgsql;
using NpgsqlTypes;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Repository;

internal sealed partial class EngineRepository
{
    /// <summary>
    /// The mailbox columns every mailbox read projects, in one place so the reader offsets below stay
    /// aligned with them. Qualified with an alias so it can be used in joins and CTEs alike.
    /// </summary>
    private const string MailboxColumns = """
        m.id, m.namespace, m.idempotency_key, m.collection_key, m.timeout, m.deadline,
        m.status, m.disposed_reason, m.next_idx, m.next_seq, m.created_at, m.disposed_at
        """;

    /// <summary>
    /// The delivery columns every delivery read projects. <c>payload</c> is deliberately absent: nothing
    /// on the ingestion path needs the body back, and it is the one column large enough for reading it
    /// needlessly to cost something.
    /// </summary>
    private const string MailboxDeliveryColumns = "d.mailbox_id, d.idx, d.idempotency_key, d.accepted_at";

    /// <inheritdoc/>
    public async Task<MailboxMintResult> MintMailbox(
        Guid mailboxId,
        string ns,
        string idempotencyKey,
        string? collectionKey,
        TimeSpan timeout,
        DateTimeOffset now,
        int maxOpenPerCollection,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.MintMailbox");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            MailboxMintResult result = new MailboxMintResult.AtCollectionCapacity();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    // One statement, and the order of the CTEs is the semantics.
                    //
                    // `existing` is consulted first and unconditionally, so a replay returns the mailbox
                    // it already minted even when the collection is at its cap: refusing a replay would
                    // strand a saga that has already handed the mailbox id to a counterparty.
                    //
                    // `open_count` bounds only genuinely new mailboxes, and only when a collection was
                    // named — the cap is per collection, and a mailbox without one has no collection to
                    // be counted against.
                    //
                    // The INSERT is the mint's serialization point: it has no row to lock first because
                    // the row is what it creates, so the unique index on (namespace, idempotency_key)
                    // does that job instead. ON CONFLICT DO UPDATE rather than DO NOTHING so a mint that
                    // loses the race against a concurrent one still blocks on, and then returns, the
                    // winner's row instead of coming back empty. The caller tells the two apart by
                    // whether the returned id is the one it generated.
                    const string sql = $"""
                        WITH existing AS (
                            SELECT {MailboxColumns}
                            FROM engine.mailboxes m
                            WHERE m.namespace = @ns AND m.idempotency_key = @key
                        ),
                        open_count AS (
                            SELECT count(*)::int AS n
                            FROM engine.mailboxes m
                            WHERE m.namespace = @ns
                              AND m.collection_key = @collection_key
                              AND m.status = '{MailboxStatusMap.Open}'
                        ),
                        inserted AS (
                            INSERT INTO engine.mailboxes AS m (
                                id, namespace, idempotency_key, collection_key, timeout, deadline,
                                next_idx, next_seq, status, disposed_reason, created_at, disposed_at
                            )
                            SELECT @id, @ns, @key, @collection_key, @timeout, @deadline,
                                   0, 0, '{MailboxStatusMap.Open}', NULL, @now, NULL
                            WHERE NOT EXISTS (SELECT 1 FROM existing)
                              AND (@collection_key IS NULL OR (SELECT n FROM open_count) < @cap)
                            ON CONFLICT (namespace, idempotency_key) DO UPDATE
                                SET namespace = EXCLUDED.namespace
                            RETURNING {MailboxColumns}
                        )
                        SELECT * FROM inserted
                        UNION ALL
                        SELECT * FROM existing
                        """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("key", idempotencyKey));
                    cmd.Parameters.Add(
                        new NpgsqlParameter("collection_key", (object?)collectionKey ?? DBNull.Value)
                        {
                            NpgsqlDbType = NpgsqlDbType.Varchar,
                        }
                    );
                    cmd.Parameters.Add(new NpgsqlParameter<TimeSpan>("timeout", timeout));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("deadline", now + timeout));
                    cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                    cmd.Parameters.Add(new NpgsqlParameter<int>("cap", maxOpenPerCollection));

                    await using var reader = await cmd.ExecuteReaderAsync(ct);
                    if (!await reader.ReadAsync(ct))
                    {
                        result = new MailboxMintResult.AtCollectionCapacity();
                        return;
                    }

                    var mailbox = ReadMailbox(reader);
                    result =
                        mailbox.Id == mailboxId
                            ? new MailboxMintResult.Minted(mailbox)
                            : new MailboxMintResult.Existing(mailbox);
                },
                cancellationToken
            );

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxOperation("mint", mailboxId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<MailboxResponse?> GetMailbox(
        Guid mailboxId,
        string ns,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetMailbox");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            MailboxResponse? mailbox = null;
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    const string sql = $"""
                        SELECT {MailboxColumns}
                        FROM engine.mailboxes m
                        WHERE m.id = @id AND m.namespace = @ns
                        """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                    cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));

                    await using var reader = await cmd.ExecuteReaderAsync(ct);
                    mailbox = await reader.ReadAsync(ct) ? ReadMailbox(reader) : null;
                },
                cancellationToken
            );

            return mailbox;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxOperation("get", mailboxId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<MailboxCloseResult> CloseMailbox(
        Guid mailboxId,
        string ns,
        MailboxDisposedReason reason,
        DateTimeOffset now,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.CloseMailbox");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            MailboxCloseResult result = new MailboxCloseResult.NotFound();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    await using var tx = await conn.BeginTransactionAsync(ct);

                    // The mailbox row lock is this transaction's first act — the discipline every
                    // mailbox mutation follows, and the reason the state read below can be decided on:
                    // whoever else is closing this mailbox, ingesting a delivery into it, or enqueuing a
                    // receiver against it waits here rather than interleaving with us.
                    const string lockSql = $"""
                        SELECT {MailboxColumns}
                        FROM engine.mailboxes m
                        WHERE m.id = @id AND m.namespace = @ns
                        FOR UPDATE
                        """;

                    MailboxResponse? locked;
                    await using (var lockCmd = new NpgsqlCommand(lockSql, conn, tx))
                    {
                        lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        lockCmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));

                        await using var reader = await lockCmd.ExecuteReaderAsync(ct);
                        locked = await reader.ReadAsync(ct) ? ReadMailbox(reader) : null;
                    }

                    if (locked is null)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxCloseResult.NotFound();
                        return;
                    }

                    // Whoever closed it first wins, including the deadline sweep: the replay reports the
                    // original reason and instant rather than overwriting them with this call's.
                    if (locked.Status == MailboxStatus.Disposed)
                    {
                        await tx.CommitAsync(ct);
                        result = new MailboxCloseResult.AlreadyClosed(locked);
                        return;
                    }

                    const string closeSql = $"""
                        UPDATE engine.mailboxes AS m
                        SET status = '{MailboxStatusMap.Disposed}',
                            disposed_reason = @reason,
                            disposed_at = @now
                        WHERE m.id = @id
                        RETURNING {MailboxColumns}
                        """;

                    await using (var closeCmd = new NpgsqlCommand(closeSql, conn, tx))
                    {
                        closeCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        closeCmd.Parameters.Add(
                            new NpgsqlParameter<string>("reason", MailboxStatusMap.ToDbValue(reason))
                        );
                        closeCmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

                        await using var reader = await closeCmd.ExecuteReaderAsync(ct);

                        // Unreachable: we hold this row's lock, and nothing deletes a mailbox out from
                        // under one. Kept as a loud failure rather than a silent NotFound, and knowingly
                        // classified wrong — RetryErrorHandler treats InvalidOperationException as
                        // transient, so this would retry to the command timeout and be logged as a
                        // suspected database outage. Correcting that means widening the classifier's
                        // abort set, which is a shared decision for every repository operation and does
                        // not belong to the one call site that would benefit.
                        if (!await reader.ReadAsync(ct))
                            throw new InvalidOperationException(
                                $"Mailbox {mailboxId} vanished while its row lock was held."
                            );

                        result = new MailboxCloseResult.Closed(ReadMailbox(reader));
                    }

                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxOperation("close", mailboxId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<MailboxDeliveryResult> DeliverToMailbox(
        Guid mailboxId,
        string ns,
        string idempotencyKey,
        string payload,
        DateTimeOffset now,
        int maxLogLength,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.DeliverToMailbox");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            MailboxDeliveryResult result = new MailboxDeliveryResult.NotFound();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    await using var tx = await conn.BeginTransactionAsync(ct);

                    // The mailbox row lock is this transaction's first act. Everything below decides on
                    // state carried by that row — its status and its next position — so reading any of it
                    // before the lock would be reading a snapshot that another delivery, an enqueue, or a
                    // close is free to invalidate before this transaction writes.
                    const string lockSql = $"""
                        SELECT {MailboxColumns}
                        FROM engine.mailboxes m
                        WHERE m.id = @id AND m.namespace = @ns
                        FOR UPDATE
                        """;

                    MailboxResponse? locked;
                    await using (var lockCmd = new NpgsqlCommand(lockSql, conn, tx))
                    {
                        lockCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        lockCmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));

                        await using var reader = await lockCmd.ExecuteReaderAsync(ct);
                        locked = await reader.ReadAsync(ct) ? ReadMailbox(reader) : null;
                    }

                    if (locked is null)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxDeliveryResult.NotFound();
                        return;
                    }

                    // Looked up before the refusals below, and the order is the "accepted versus kept"
                    // rule in code: what the engine kept, it keeps answering for. A resend of a message
                    // that was accepted while the mailbox was open is a replay even now that the mailbox
                    // is closed or its log is full — reporting it as a refusal would make a forwarder
                    // dead-letter a message that is already sitting at its position waiting to be read.
                    //
                    // The same lookup is what makes ExecuteWithRetry safe to re-run this whole delegate
                    // over: a retry after a commit whose acknowledgement was lost finds the delivery its
                    // own first attempt made and answers Duplicate. That is not a compromise but the
                    // literal truth — the engine kept the message, and a replay is what a replay is told.
                    const string existingSql = $"""
                        SELECT {MailboxDeliveryColumns}
                        FROM engine.mailbox_deliveries d
                        WHERE d.mailbox_id = @id AND d.idempotency_key = @key
                        """;

                    MailboxDeliveryResponse? existing;
                    await using (var existingCmd = new NpgsqlCommand(existingSql, conn, tx))
                    {
                        existingCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        existingCmd.Parameters.Add(new NpgsqlParameter<string>("key", idempotencyKey));

                        await using var reader = await existingCmd.ExecuteReaderAsync(ct);
                        existing = await reader.ReadAsync(ct) ? ReadMailboxDelivery(reader) : null;
                    }

                    if (existing is not null)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxDeliveryResult.Duplicate(existing);
                        return;
                    }

                    // Every path from here that is not an append rolls back, which is what makes "a
                    // refused delivery inserts nothing" true of the transaction and not merely of the
                    // statements this code chose to skip. It is also why no idempotency key needs
                    // releasing afterwards: a refusal never claimed one.
                    if (locked.Status == MailboxStatus.Disposed)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxDeliveryResult.Closed(locked);
                        return;
                    }

                    if (locked.NextIdx >= maxLogLength)
                    {
                        await tx.RollbackAsync(ct);
                        result = new MailboxDeliveryResult.LogFull(locked.NextIdx);
                        return;
                    }

                    // The position comes from the row's own counter rather than from the value read
                    // above, so the log is gapless by construction: the increment and the insert that
                    // consumes it are one statement, and the mailbox lock serializes the statement.
                    const string appendSql = $"""
                        WITH bumped AS (
                            UPDATE engine.mailboxes
                            SET next_idx = next_idx + 1
                            WHERE id = @id
                            RETURNING next_idx - 1 AS idx
                        )
                        INSERT INTO engine.mailbox_deliveries AS d (
                            mailbox_id, idx, idempotency_key, payload, accepted_at
                        )
                        SELECT @id, bumped.idx, @key, @payload, @now FROM bumped
                        RETURNING {MailboxDeliveryColumns}
                        """;

                    await using (var appendCmd = new NpgsqlCommand(appendSql, conn, tx))
                    {
                        appendCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
                        appendCmd.Parameters.Add(new NpgsqlParameter<string>("key", idempotencyKey));
                        appendCmd.Parameters.Add(new NpgsqlParameter<string>("payload", payload));
                        appendCmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

                        await using var reader = await appendCmd.ExecuteReaderAsync(ct);

                        // Unreachable for the same reason the close's equivalent is: the mailbox row's
                        // lock is held, so its counter cannot vanish between the read above and this
                        // statement. Kept loud rather than silently answering NotFound, and carrying the
                        // same known misclassification — RetryErrorHandler treats
                        // InvalidOperationException as transient, so this would retry to the command
                        // timeout and then be logged as a suspected database outage. Correcting it means
                        // widening the classifier's abort set, a shared decision for every repository
                        // operation rather than one this call site should take.
                        if (!await reader.ReadAsync(ct))
                            throw new InvalidOperationException(
                                $"Mailbox {mailboxId} vanished while its row lock was held."
                            );

                        result = new MailboxDeliveryResult.Accepted(ReadMailboxDelivery(reader));
                    }

                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedMailboxOperation("deliver to", mailboxId, ex.Message, ex);
            throw;
        }
    }

    /// <summary>
    /// Projects one row of <see cref="MailboxColumns"/> into its response shape.
    /// </summary>
    private static MailboxResponse ReadMailbox(NpgsqlDataReader reader)
    {
#pragma warning disable CA1849, S6966 // Synchronous accessors are intentional - the row is already buffered
        return new MailboxResponse
        {
            Id = reader.GetGuid(0),
            Namespace = reader.GetString(1),
            IdempotencyKey = reader.GetString(2),
            CollectionKey = reader.IsDBNull(3) ? null : reader.GetString(3),
            Timeout = reader.GetFieldValue<TimeSpan>(4),
            Deadline = reader.GetFieldValue<DateTimeOffset>(5),
            Status = MailboxStatusMap.FromDbValue(reader.GetString(6)),
            DisposedReason = reader.IsDBNull(7) ? null : MailboxStatusMap.ReasonFromDbValue(reader.GetString(7)),
            NextIdx = reader.GetInt64(8),
            NextSeq = reader.GetInt64(9),
            CreatedAt = reader.GetFieldValue<DateTimeOffset>(10),
            DisposedAt = reader.IsDBNull(11) ? null : reader.GetFieldValue<DateTimeOffset>(11),
        };
#pragma warning restore CA1849, S6966
    }

    /// <summary>
    /// Projects one row of <see cref="MailboxDeliveryColumns"/> into its response shape.
    /// </summary>
    private static MailboxDeliveryResponse ReadMailboxDelivery(NpgsqlDataReader reader)
    {
#pragma warning disable CA1849, S6966 // Synchronous accessors are intentional - the row is already buffered
        return new MailboxDeliveryResponse
        {
            MailboxId = reader.GetGuid(0),
            Idx = reader.GetInt64(1),
            IdempotencyKey = reader.GetString(2),
            AcceptedAt = reader.GetFieldValue<DateTimeOffset>(3),
        };
#pragma warning restore CA1849, S6966
    }
}

/// <summary>
/// Outcome of a mailbox mint.
/// </summary>
internal abstract record MailboxMintResult
{
    private MailboxMintResult() { }

    /// <summary>
    /// This call created the mailbox.
    /// </summary>
    internal sealed record Minted(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>
    /// The idempotency key had already minted a mailbox, which is returned unchanged. A replay is
    /// answered even when the collection is at its cap.
    /// </summary>
    internal sealed record Existing(MailboxResponse Mailbox) : MailboxMintResult;

    /// <summary>
    /// The request could not be minted from. Never reaches the database: the mint's keys are
    /// <c>varchar(200)</c>, and an over-long one would otherwise surface as a transient-looking
    /// database error and be retried to the command timeout instead of being answered.
    /// </summary>
    internal sealed record Invalid(string Message) : MailboxMintResult;

    /// <summary>
    /// The collection already holds <see cref="EngineSettings.MaxOpenMailboxesPerCollection"/> open
    /// mailboxes, so nothing was created.
    /// </summary>
    internal sealed record AtCollectionCapacity : MailboxMintResult;
}

/// <summary>
/// Outcome of closing a mailbox.
/// </summary>
internal abstract record MailboxCloseResult
{
    private MailboxCloseResult() { }

    /// <summary>
    /// This call closed the mailbox.
    /// </summary>
    internal sealed record Closed(MailboxResponse Mailbox) : MailboxCloseResult;

    /// <summary>
    /// The mailbox was already closed, by an earlier call or by the deadline. Carries the mailbox as it
    /// stands, so the caller reports the original reason and instant.
    /// </summary>
    internal sealed record AlreadyClosed(MailboxResponse Mailbox) : MailboxCloseResult;

    /// <summary>
    /// No mailbox with that id exists in the namespace.
    /// </summary>
    internal sealed record NotFound : MailboxCloseResult;
}

/// <summary>
/// Outcome of delivering a message into a mailbox.
/// </summary>
/// <remarks>
/// Two of these outcomes are successes and the rest are refusals, and the line between them is the
/// design's <em>accepted versus kept</em> rule: what the engine kept it keeps answering
/// <see cref="Duplicate"/> for, whatever has happened to the mailbox since; what it refused it keeps
/// refusing. A refusal writes nothing at all, so nothing needs releasing when one is repeated.
/// </remarks>
internal abstract record MailboxDeliveryResult
{
    private MailboxDeliveryResult() { }

    /// <summary>
    /// This call appended the delivery, which now holds the position it reports.
    /// </summary>
    internal sealed record Accepted(MailboxDeliveryResponse Delivery) : MailboxDeliveryResult;

    /// <summary>
    /// The idempotency key had already delivered a message into this mailbox, and it is returned at the
    /// position it has held since. Answered even on a closed or full mailbox.
    /// </summary>
    internal sealed record Duplicate(MailboxDeliveryResponse Delivery) : MailboxDeliveryResult;

    /// <summary>
    /// No mailbox with that id exists in the namespace.
    /// </summary>
    internal sealed record NotFound : MailboxDeliveryResult;

    /// <summary>
    /// The mailbox is closed, so the message is too late. Carries the mailbox so the caller can report
    /// <em>how</em> it closed — by request or at its deadline — which is what makes a dead-letter record
    /// worth reading.
    /// </summary>
    internal sealed record Closed(MailboxResponse Mailbox) : MailboxDeliveryResult;

    /// <summary>
    /// The mailbox's deliveries log already holds <see cref="EngineSettings.MaxMailboxLogLength"/>
    /// positions, so nothing was appended.
    /// </summary>
    internal sealed record LogFull(long LogLength) : MailboxDeliveryResult;

    /// <summary>
    /// The payload exceeds <see cref="EngineSettings.MaxMailboxPayloadSize"/>. Refused before the
    /// database, so an oversized delivery costs a byte count and nothing else.
    /// </summary>
    internal sealed record PayloadTooLarge(string Message) : MailboxDeliveryResult;

    /// <summary>
    /// The request could not be delivered from. Never reaches the database: the delivery's
    /// <c>idempotency_key</c> is <c>varchar(200)</c>, and an over-long one would otherwise surface as a
    /// transient-looking database error and be retried to the command timeout instead of being answered.
    /// </summary>
    internal sealed record Invalid(string Message) : MailboxDeliveryResult;
}
