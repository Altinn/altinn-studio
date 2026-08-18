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
