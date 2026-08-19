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

    /// <summary>
    /// The one statement that ever releases a parked receiver — v2's <c>Held</c>-release, joined through
    /// the receivers registry — used by both of the design's exactly two releases: the wake, which passes
    /// the position a delivery just landed at, and the closure release, which passes none and takes every
    /// receiver the mailbox still holds parked.
    /// </summary>
    /// <remarks>
    /// <para>
    /// One statement rather than two so the status transition and the <c>released_at</c> stamp cannot
    /// diverge: a receiver is runnable exactly when its registry row says it was released. It is also
    /// the whole compound lock acquisition in the design — the caller already holds the mailbox row, and
    /// this takes the workflow rows — so the order <c>mailbox row → workflow row</c> is a property of
    /// this statement existing only here.
    /// </para>
    /// <para>
    /// The <c>@seq IS NULL</c> disjunction is what makes it one routine instead of two near-copies. It
    /// costs nothing: a mailbox holds at most <c>MaxMailboxLogLength</c> registry rows, and
    /// <c>mailbox_id</c> alone is the leading column of their primary key, so both shapes are an index
    /// scan over a handful of rows.
    /// </para>
    /// <para>
    /// <c>released_at IS NULL</c> and <c>status = @held</c> are both guards rather than filters, and they
    /// guard different things. The stamp keeps the first release's instant when a second release looks at
    /// the same row; the status keeps a release from resurrecting a receiver that has since been claimed,
    /// run, or settled. Between them they are also what makes a registry that holds <em>every</em>
    /// receiver safe to run this over: a receiver born runnable arrives already stamped and already
    /// <c>Enqueued</c>, so each guard excludes it independently and neither release can touch it. Neither
    /// guard can fire in a correct engine — a closed mailbox refuses deliveries, so nothing can wake a
    /// receiver the closure released — and both are cheap enough that proving that by inspection is not
    /// worth the risk of being wrong.
    /// </para>
    /// </remarks>
    private const string ReleaseMailboxReceiversSql = """
        WITH released AS (
            UPDATE engine.workflows AS w
            SET status = @enqueued,
                backoff_until = NULL,
                updated_at = @now
            FROM engine.mailbox_receivers AS mr
            WHERE mr.mailbox_id = @mailbox_id
              AND (@seq IS NULL OR mr.seq = @seq)
              AND mr.released_at IS NULL
              AND w.id = mr.workflow_id
              AND w.status = @held
            RETURNING w.id
        )
        UPDATE engine.mailbox_receivers AS mr
        SET released_at = @now
        FROM released
        WHERE mr.workflow_id = released.id
        """;

    /// <summary>
    /// Releases parked receivers of one mailbox and returns how many became runnable.
    /// </summary>
    /// <param name="conn">A connection whose transaction already holds the mailbox's row lock.</param>
    /// <param name="tx">The transaction the release must be part of — the delivery's, or the closure's.</param>
    /// <param name="mailboxId">The mailbox whose parked receivers are released.</param>
    /// <param name="seq">
    /// The single position to release, or <c>null</c> to release every parked receiver. The wake passes
    /// the <c>idx</c> the delivery took; the closure release passes <c>null</c>.
    /// </param>
    /// <param name="now">The release instant, stamped on both the workflow and the registry row.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    private static async Task<int> ReleaseMailboxReceivers(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        long? seq,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        await using var cmd = new NpgsqlCommand(ReleaseMailboxReceiversSql, conn, tx);
        cmd.Parameters.Add(new NpgsqlParameter<Guid>("mailbox_id", mailboxId));
        cmd.Parameters.Add(
            new NpgsqlParameter("seq", NpgsqlDbType.Bigint) { Value = seq.HasValue ? seq.Value : DBNull.Value }
        );
        cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
        cmd.Parameters.Add(new NpgsqlParameter<int>("enqueued", (int)PersistentItemStatus.Enqueued));
        cmd.Parameters.Add(new NpgsqlParameter<int>("held", (int)PersistentItemStatus.Held));
        return await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// The wake: releases the receiver standing at <paramref name="seq"/>, if one is, and returns whether
    /// it did. At most one receiver can stand there — <c>(mailbox_id, seq)</c> is the registry's primary
    /// key — so the answer is a yes or a no rather than a count.
    /// </summary>
    private static async Task<bool> ReleaseReceiverAt(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        long seq,
        DateTimeOffset now,
        CancellationToken cancellationToken
    ) => await ReleaseMailboxReceivers(conn, tx, mailboxId, seq, now, cancellationToken) > 0;

    /// <summary>
    /// The closure release: releases every receiver still parked on the mailbox and returns how many
    /// there were. Every one of them, not the next one — a closed mailbox accepts no further deliveries,
    /// so all their truths were frozen at the same instant.
    /// </summary>
    private static Task<int> ReleaseAllParkedReceivers(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid mailboxId,
        DateTimeOffset now,
        CancellationToken cancellationToken
    ) => ReleaseMailboxReceivers(conn, tx, mailboxId, seq: null, now, cancellationToken);

    /// <summary>
    /// Signals the processor that a release made work runnable.
    /// </summary>
    /// <remarks>
    /// Issued <em>inside</em> the releasing transaction, which is not a shortcut for "after commit" but a
    /// stronger version of it: PostgreSQL queues a <c>NOTIFY</c> until its transaction commits and drops
    /// it on rollback, so the notification is delivered exactly when the release is durable. Sending it
    /// after <c>COMMIT</c> instead would add a statement that can fail on an already-committed
    /// transaction, and <see cref="ExecuteWithRetry"/> would then re-run the whole delegate — turning a
    /// delivery that <em>was</em> accepted into a <c>Duplicate</c> answer for the caller. The engine's
    /// write-back path takes the same position for the same reason.
    /// <para>
    /// Either way the signal is acceleration and nothing else: a release that commits and never notifies
    /// is picked up by the next fetch cycle, which is a property the design depends on and a test pins.
    /// </para>
    /// </remarks>
    private static async Task NotifyStatusChanged(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        CancellationToken cancellationToken
    )
    {
        await using var cmd = new NpgsqlCommand("NOTIFY status_changed", conn, tx);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

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
            // Normalized on entry, as every other namespaced repository operation does. The mailbox
            // tables are reached by the same namespaces the workflow tables are, so one contract for the
            // parameter is the only way a mailbox minted under one casing stays reachable from a workflow
            // enqueued under another.
            ns = WorkflowNamespace.Normalize(ns);

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
            ns = WorkflowNamespace.Normalize(ns);

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

    /// <summary>
    /// The executor's read of the rendezvous — the receiver's position and the message standing at it,
    /// in one statement. Deliberately the whole of what a receive workflow's first step is handed.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <strong>It takes no lock and writes nothing</strong>, and neither omission is an oversight. By the
    /// time a receiver can be fetched, whether a delivery exists at its position is already frozen — it
    /// was born with the delivery, or the delivery's own transaction released it, or the mailbox closed
    /// and closed mailboxes refuse deliveries — so there is no state left for a lock to protect and no
    /// answer worth recording. Recording one would in fact be worse than useless: a stored verdict is
    /// something that can disagree with the log, and re-deriving is what makes the frozen-meaning rule a
    /// property of the schema rather than of bookkeeping nobody re-checks.
    /// </para>
    /// <para>
    /// The three tables are joined rather than read in sequence: a unique-index probe on
    /// <c>workflow_id</c> for the position, then primary-key probes for the delivery and for the
    /// mailbox's closure reason, in one round trip.
    /// </para>
    /// <para>
    /// <strong>The single snapshot is what makes <see cref="MailboxReceiptResult.Undecided"/> worth
    /// raising.</strong> The frozen rule already stabilizes the delivery answer, so split statements
    /// would agree with this one in every legitimate case. What they would lose is the illegitimate
    /// one: under <c>READ COMMITTED</c> a read that saw no delivery — a genuine invariant violation —
    /// could then see a concurrent close and report an entirely ordinary closing signal, laundering the
    /// error through traffic that happens constantly. One statement means the two rows are read at one
    /// instant and the alarm cannot be silenced by a race.
    /// </para>
    /// <para>
    /// <c>held_at</c> is deliberately not consulted. It records how the receiver was <em>born</em>, not
    /// whether a delivery exists, and a receiver born runnable is exactly the case whose message is
    /// already sitting at its position — deciding from it would hand the closing signal to the receiver
    /// least entitled to it.
    /// </para>
    /// </remarks>
    /// <param name="workflowId">The receive workflow being executed.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task<MailboxReceiptResult> ReadMailboxReceipt(
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.ReadMailboxReceipt");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            MailboxReceiptResult result = new MailboxReceiptResult.Unregistered();
            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);

                    const string sql = """
                        SELECT mr.mailbox_id, mr.seq, m.status, m.disposed_reason,
                               d.idempotency_key, d.payload, d.accepted_at
                        FROM engine.mailbox_receivers mr
                        JOIN engine.mailboxes m ON m.id = mr.mailbox_id
                        LEFT JOIN engine.mailbox_deliveries d
                               ON d.mailbox_id = mr.mailbox_id AND d.idx = mr.seq
                        WHERE mr.workflow_id = @workflow_id
                        """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid>("workflow_id", workflowId));

                    await using var reader = await cmd.ExecuteReaderAsync(ct);
                    result = await reader.ReadAsync(ct)
                        ? ReadMailboxReceipt(reader)
                        : new MailboxReceiptResult.Unregistered();
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
            logger.FailedMailboxReceiptRead(workflowId, ex.Message, ex);
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
            ns = WorkflowNamespace.Normalize(ns);

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

                    result = await CloseLockedMailbox(conn, tx, locked, reason, now, ct);

                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );

            result.Record();

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
    /// Closes a mailbox whose row the caller has already locked and read: mark it disposed, and release
    /// every receiver parked on it. This is the whole closure routine, and there is exactly one of it —
    /// the caller's only job is to hold the row.
    /// </summary>
    /// <remarks>
    /// Split from <see cref="CloseMailbox"/> so the deadline sweep can run the identical routine from
    /// under its own claim. The sweep's <c>FOR UPDATE SKIP LOCKED</c> claim <em>is</em> the mailbox row
    /// lock this method requires, so it calls straight in with
    /// <see cref="MailboxDisposedReason.Deadline"/>; nothing about "closed by request" or "closed at the
    /// deadline" differs below, which is what makes a <c>DELETE</c> racing the sweep a first-writer-wins
    /// no-op rather than two half-closures.
    /// <para>
    /// Releasing under the same lock is what makes closure safe against an in-flight receiver enqueue:
    /// the enqueue either got the lock first, in which case its registry row is in the set released
    /// here, or it
    /// waits and then reads a disposed mailbox and is born runnable with the closing signal. There is no
    /// interleaving that parks a receiver on a closed mailbox, which would be a receiver nothing could
    /// ever release.
    /// </para>
    /// </remarks>
    private static async Task<MailboxCloseResult> CloseLockedMailbox(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        MailboxResponse locked,
        MailboxDisposedReason reason,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        // Whoever closed it first wins, including the deadline sweep: the replay reports the original
        // reason and instant rather than overwriting them with this call's. It releases nothing either,
        // and cannot need to — the first close released every parked receiver that existed, and an
        // enqueue against
        // a closed mailbox parks no new one.
        if (locked.Status == MailboxStatus.Disposed)
            return new MailboxCloseResult.AlreadyClosed(locked);

        const string closeSql = $"""
            UPDATE engine.mailboxes AS m
            SET status = '{MailboxStatusMap.Disposed}',
                disposed_reason = @reason,
                disposed_at = @now
            WHERE m.id = @id
            RETURNING {MailboxColumns}
            """;

        MailboxResponse closed;
        await using (var closeCmd = new NpgsqlCommand(closeSql, conn, tx))
        {
            closeCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", locked.Id));
            closeCmd.Parameters.Add(new NpgsqlParameter<string>("reason", MailboxStatusMap.ToDbValue(reason)));
            closeCmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

            await using var reader = await closeCmd.ExecuteReaderAsync(cancellationToken);

            // Unreachable: we hold this row's lock, and nothing deletes a mailbox out from under one.
            // Kept as a loud failure rather than a silent NotFound, and knowingly classified wrong —
            // RetryErrorHandler treats InvalidOperationException as transient, so this would retry to the
            // command timeout and be logged as a suspected database outage. Correcting that means
            // widening the classifier's abort set, which is a shared decision for every repository
            // operation and does not belong to the one call site that would benefit.
            if (!await reader.ReadAsync(cancellationToken))
                throw new InvalidOperationException($"Mailbox {locked.Id} vanished while its row lock was held.");

            closed = ReadMailbox(reader);
        }

        var released = await ReleaseAllParkedReceivers(conn, tx, locked.Id, now, cancellationToken);

        if (released > 0)
            await NotifyStatusChanged(conn, tx, cancellationToken);

        return new MailboxCloseResult.Closed(closed, new MailboxReleaseCounts(Delivered: 0, Closed: released));
    }

    /// <summary>
    /// The overdue claim. Not a plain read despite reading nothing the sweep decides differently on:
    /// <c>FOR UPDATE</c> makes it the mailbox row lock <see cref="CloseLockedMailbox"/> requires, and
    /// <c>SKIP LOCKED</c> makes it a claim — a mailbox another pod's sweep, a <c>DELETE</c>, a delivery or
    /// an enqueue is holding is left for the next tick instead of queued behind.
    /// </summary>
    /// <remarks>
    /// The status and deadline predicates are re-evaluated against the locked row, so a mailbox that a
    /// <c>DELETE</c> closed between this transaction's snapshot and its lock returns nothing here and is
    /// simply not swept. That is the whole of "a <c>DELETE</c> racing the sweep": whoever locks first
    /// closes it, and the loser never reaches the routine at all.
    /// </remarks>
    private const string ClaimOverdueMailboxSql = $"""
        SELECT {MailboxColumns}
        FROM engine.mailboxes m
        WHERE m.id = @id
          AND m.status = '{MailboxStatusMap.Open}'
          AND m.deadline <= @now
        FOR UPDATE SKIP LOCKED
        """;

    /// <inheritdoc/>
    public async Task<MailboxSweepResult> SweepOverdueMailboxes(
        DateTimeOffset now,
        int batchSize,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.SweepOverdueMailboxes");
        activity?.DontRecord();

        var candidates = await SelectOverdueMailboxCandidates(now, batchSize, cancellationToken);
        if (candidates.Count == 0)
            return default;

        activity?.Record();
        activity?.SetTag("mailboxes.overdue", candidates.Count);

        var result = new MailboxSweepResult();
        foreach (var mailboxId in candidates)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                result += await CloseOverdueMailbox(mailboxId, now, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Per-mailbox isolation, and it is the one lesson worth carrying over from the exchange
                // sweep this replaces. Each mailbox has its own transaction, so a throw here has already
                // rolled that mailbox's close back and left it open, overdue, and claimable next tick —
                // exactly where it started. Letting the exception escape instead would abandon every
                // mailbox behind it in the batch, and since the candidate scan orders by deadline the same
                // mailbox would lead the next batch too: a permanent wedge rather than a delay, taking the
                // "no exchange outlives its deadline" guarantee down with it.
                //
                // Treated as transient without exception, because there is no permanent shape to
                // recognize: the routine takes no caller-supplied body, only a row the engine wrote.
                // Retrying forever is the correct answer to a database problem, and the log names the
                // mailbox so one that never drains is identifiable rather than merely counted.
                result = result with
                {
                    Failed = result.Failed + 1,
                };

                // Tagged apart from the sweep pass's own failures on purpose. This one is self-healing —
                // the mailbox stays claimable and the next pass takes it — while a failure tagged
                // "mailboxDeadlineSweep" means the pass itself did not run and the deadline guarantee is
                // off for everything. An operator cannot tell "one poisoned mailbox" from "the sweep is
                // down" if both arrive under one tag, and they want opposite responses.
                Metrics.Errors.Add(1, ("operation", "mailboxDeadlineClose"));
                logger.FailedMailboxOperation("close at its deadline", mailboxId, ex.Message, ex);
            }
        }

        return result;
    }

    /// <summary>
    /// The deadline sweep's candidate scan, hoisted to a named constant so <c>QueryPlanTests</c> can
    /// <c>EXPLAIN</c> the statement the sweep actually issues rather than a copy of it — the same reason
    /// <c>DbMaintenanceService.Sql</c> holds its commands that way.
    /// </summary>
    /// <remarks>
    /// The predicate and the ordering together are what <c>ix_mailboxes_deadline_open</c> is partial and
    /// keyed on, so a tick with nothing overdue reads one index entry and stops.
    /// </remarks>
    internal const string SelectOverdueMailboxCandidatesSql = $"""
        SELECT m.id
        FROM engine.mailboxes m
        WHERE m.status = '{MailboxStatusMap.Open}'
          AND m.deadline <= @now
        ORDER BY m.deadline
        LIMIT @batch_size
        """;

    /// <summary>
    /// Reads the ids of mailboxes whose deadline has passed while they are still open, oldest deadline
    /// first. Deliberately takes no locks: it selects <em>candidates</em>, and each one is claimed under
    /// its own transaction below, so a slow close cannot make this scan hold a row.
    /// </summary>
    private async Task<List<Guid>> SelectOverdueMailboxCandidates(
        DateTimeOffset now,
        int batchSize,
        CancellationToken cancellationToken
    )
    {
        using var slot = await limiter.AcquireDbSlot(cancellationToken: cancellationToken);

        var candidates = new List<Guid>();
        await ExecuteWithRetry(
            async ct =>
            {
                candidates.Clear();

                await using var conn = await dataSource.OpenConnectionAsync(ct);

                await using var cmd = new NpgsqlCommand(SelectOverdueMailboxCandidatesSql, conn);
                cmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));
                cmd.Parameters.Add(new NpgsqlParameter<int>("batch_size", batchSize));

                await using var reader = await cmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
#pragma warning disable CA1849, S6966 // The row is already buffered
                    candidates.Add(reader.GetGuid(0));
#pragma warning restore CA1849, S6966
                }
            },
            cancellationToken
        );

        return candidates;
    }

    /// <summary>
    /// Closes one overdue mailbox in its own transaction, running exactly the routine <c>DELETE</c> runs.
    /// </summary>
    /// <remarks>
    /// No <see cref="ExecuteWithRetry"/>, and the omission is deliberate: the sweep's cadence is its retry.
    /// A re-run of this delegate after a commit whose acknowledgement was lost would find the mailbox
    /// already closed and report a close it had in fact performed as a no-op, losing the released count and
    /// the unconsumed number this pass owed — whereas a genuinely failed close leaves the mailbox open and
    /// overdue, and the next tick claims it again with nothing lost.
    /// </remarks>
    private async Task<MailboxSweepResult> CloseOverdueMailbox(
        Guid mailboxId,
        DateTimeOffset now,
        CancellationToken cancellationToken
    )
    {
        using var slot = await limiter.AcquireDbSlot(cancellationToken: cancellationToken);

        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        MailboxResponse? claimed;
        await using (var claimCmd = new NpgsqlCommand(ClaimOverdueMailboxSql, conn, tx))
        {
            claimCmd.Parameters.Add(new NpgsqlParameter<Guid>("id", mailboxId));
            claimCmd.Parameters.Add(new NpgsqlParameter<DateTimeOffset>("now", now));

            await using var reader = await claimCmd.ExecuteReaderAsync(cancellationToken);
            claimed = await reader.ReadAsync(cancellationToken) ? ReadMailbox(reader) : null;
        }

        if (claimed is null)
        {
            await tx.RollbackAsync(cancellationToken);
            return default;
        }

        var result = await CloseLockedMailbox(
            conn,
            tx,
            claimed,
            MailboxDisposedReason.Deadline,
            now,
            cancellationToken
        );

        await tx.CommitAsync(cancellationToken);

        // After the commit, and through the result rather than beside the statements, so the sweep cannot
        // get the tag set wrong: the closure's own counters — including the `deadline` reason, read off the
        // row that was actually written — come for free from the routine it shares with DELETE.
        result.Record();

        if (result is not MailboxCloseResult.Closed closed)
            return default;

        // The unconsumed count is the sweep's alone to publish. A DELETE reports the same number to a
        // caller who can act on it; a mailbox that aged out has no such caller, so if this pass does not
        // count them, nothing ever does.
        var unconsumed = closed.Mailbox.UnconsumedDeliveries;
        if (unconsumed > 0)
        {
            Metrics.MailboxDeliveriesUnconsumed.Add(unconsumed);
            logger.MailboxClosedWithUnconsumedDeliveries(mailboxId, unconsumed);
        }

        return new MailboxSweepResult(
            Closed: 1,
            ReceiversReleased: closed.Released.Closed,
            UnconsumedDeliveries: unconsumed,
            Failed: 0
        );
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
            ns = WorkflowNamespace.Normalize(ns);

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

                    MailboxDeliveryResponse appended;
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

                        appended = ReadMailboxDelivery(reader);
                    }

                    // The wake, and it is inside the delivery's own transaction rather than after it.
                    // That is the property the whole rendezvous rests on: a held receiver has no timer of
                    // its own, so "the message is durable but the wake was lost" would park it until the
                    // mailbox's deadline with a message sitting at its position the entire time. Sharing
                    // the transaction makes that state one the database cannot hold, and a test proves it
                    // by transaction id rather than by observation.
                    //
                    // Exactly two interleavings, and the mailbox row lock is what leaves no third: either
                    // a receiver already registered at this position and is released here, or none has
                    // yet and the enqueue's own `seq < next_idx` comparison — taken under this same lock —
                    // will find the message waiting for it.
                    var released = await ReleaseReceiverAt(conn, tx, mailboxId, appended.Idx, now, ct);

                    if (released)
                        await NotifyStatusChanged(conn, tx, ct);

                    result = new MailboxDeliveryResult.Accepted(appended, released);

                    await tx.CommitAsync(ct);
                },
                cancellationToken
            );

            // Counted here rather than a layer up, and after the commit rather than beside the statement,
            // for the reason every release metric in this file shares: the release happens here, so a
            // caller that reaches the wake by any route counts it without having to know the tag exists.
            // A release that rolled back is not a release.
            if (result is MailboxDeliveryResult.Accepted { ReleasedReceiver: true })
                new MailboxReleaseCounts(Delivered: 1, Closed: 0).Record();

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
    /// Projects the receipt read's one row into the answer the executor acts on. The classification
    /// lives here, beside the query, because it is a statement about the rows and not about the caller.
    /// </summary>
    private static MailboxReceiptResult ReadMailboxReceipt(NpgsqlDataReader reader)
    {
#pragma warning disable CA1849, S6966 // Synchronous accessors are intentional - the row is already buffered
        var mailboxId = reader.GetGuid(0);
        var seq = reader.GetInt64(1);
        var status = MailboxStatusMap.FromDbValue(reader.GetString(2));

        if (!reader.IsDBNull(4))
        {
            return new MailboxReceiptResult.Resolved(
                MailboxReceipt.Delivered(
                    mailboxId,
                    seq,
                    new MailboxDelivery
                    {
                        IdempotencyKey = reader.GetString(4),
                        Payload = reader.GetString(5),
                        AcceptedAt = reader.GetFieldValue<DateTimeOffset>(6),
                    }
                )
            );
        }

        // No delivery and the mailbox still open: the receiver is running on a truth that is not frozen,
        // which the rendezvous makes unreachable. Reported rather than smoothed over into the closing
        // signal, which would tell a handler to conclude an exchange that is still live.
        if (status != MailboxStatus.Disposed)
            return new MailboxReceiptResult.Undecided(mailboxId, seq);

        // Read unconditionally: `ck_mailboxes_disposal_is_complete` is biconditional, so a disposed
        // mailbox always carries its reason. There is nowhere to put a defensive null anyway —
        // `MailboxReceipt.Closed` takes the reason as a parameter precisely so a receipt carrying
        // neither a delivery nor a reason cannot be built.
        return new MailboxReceiptResult.Resolved(
            MailboxReceipt.Closed(mailboxId, seq, MailboxStatusMap.ReasonFromDbValue(reader.GetString(3)))
        );
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
/// What the executor's read of the rendezvous found for one receive workflow.
/// </summary>
/// <remarks>
/// Two of the three cases are unreachable in a correct engine and are still modeled, because the
/// alternative is to encode them as an absent delivery — and an absent delivery is a real answer that
/// tells a handler to conclude its exchange. A bug that produced one of those states would then be
/// indistinguishable from the mailbox closing, and would end exchanges quietly instead of loudly.
/// </remarks>
internal abstract record MailboxReceiptResult
{
    private MailboxReceiptResult() { }

    /// <summary>
    /// The rendezvous answered: the message at the receiver's position, or the closure that means none
    /// can ever arrive there.
    /// </summary>
    internal sealed record Resolved(MailboxReceipt Receipt) : MailboxReceiptResult;

    /// <summary>
    /// The workflow holds no position in any mailbox's receivers log. Every receiver registers at
    /// enqueue, so the reachable cause is that retention purged the mailbox — with its deliveries and
    /// its registrations — under a receive workflow that outlived it, which takes a resume of a receiver
    /// that failed longer ago than the retention cutoff.
    /// </summary>
    internal sealed record Unregistered : MailboxReceiptResult;

    /// <summary>
    /// The receiver holds a position, no delivery stands at it, and the mailbox is still open — so
    /// whether a delivery will exist there is not yet settled, and the receiver is running before its
    /// truth was frozen. Unreachable through the rendezvous: the only things that make a receiver
    /// runnable are a delivery at its position and the mailbox closing.
    /// </summary>
    /// <remarks>
    /// The executor fails the step <em>critically</em> on this, and that is a real choice rather than an
    /// obvious one. Retryable is defensible: the handler is never called, so nothing has acted on the
    /// bad state and the frozen-meaning hazard never materializes — and the deadline sweep would close
    /// the mailbox eventually, after which a retry reads a legitimate closing signal and the exchange
    /// completes. It is rejected because that is self-healing, and an invariant violation that heals
    /// itself is one nobody ever looks at: the engine would be quietly wrong about its own rendezvous
    /// for as long as the mailbox had left to live. It would also make the retry ladder load-bearing in
    /// a design whose whole point is that a parked receiver needs no timer. Failing loudly leaves a
    /// visible workflow and an operator resume, which re-derives from the same rows and proceeds
    /// correctly once the mailbox has genuinely closed.
    /// </remarks>
    internal sealed record Undecided(Guid MailboxId, long Seq) : MailboxReceiptResult;
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
/// How many receivers a release made runnable, split by the only two causes there are, and how to
/// publish that.
/// </summary>
/// <remarks>
/// Modeled on <c>MailboxBirthCounts</c> and published for the same reason: after the commit, because a
/// release that rolled back released nobody. It travels on the result rather than being emitted where
/// the statement runs, so a caller that performs a release inside its own transaction — the deadline
/// sweep claims mailboxes with <c>FOR UPDATE SKIP LOCKED</c> and calls
/// <c>CloseLockedMailbox</c> directly — publishes the same telemetry by calling
/// <see cref="MailboxCloseResult.Record"/> after its own commit, instead of re-deriving which counters
/// and tag values a closure owes.
/// </remarks>
internal readonly record struct MailboxReleaseCounts(int Delivered, int Closed)
{
    public void Record()
    {
        if (Delivered > 0)
            Metrics.MailboxReceiversReleased.Add(Delivered, new KeyValuePair<string, object?>("cause", "delivered"));

        if (Closed > 0)
            Metrics.MailboxReceiversReleased.Add(Closed, new KeyValuePair<string, object?>("cause", "closed"));
    }
}

/// <summary>
/// What one pass of the deadline sweep did, summed over the mailboxes it claimed.
/// </summary>
/// <param name="Closed">Mailboxes this pass closed at their deadline.</param>
/// <param name="ReceiversReleased">Receivers those closures released to run with the no-delivery signal.</param>
/// <param name="UnconsumedDeliveries">Accepted positions across them that no receiver was ever enqueued for.</param>
/// <param name="Failed">
/// Mailboxes whose close threw and were left open, overdue, and claimable by the next pass. Nonzero is not
/// a lost close — it is a delayed one — but a value that stays nonzero across passes is a mailbox that
/// never drains, which the log names.
/// </param>
/// <remarks>
/// A claim the sweep lost — to another pod, or to a <c>DELETE</c> that closed the mailbox first — is none
/// of these: nothing failed and nothing was closed by this pass, so it contributes a zero.
/// </remarks>
internal readonly record struct MailboxSweepResult(
    int Closed = 0,
    int ReceiversReleased = 0,
    long UnconsumedDeliveries = 0,
    int Failed = 0
)
{
    public static MailboxSweepResult operator +(MailboxSweepResult left, MailboxSweepResult right) =>
        new(
            left.Closed + right.Closed,
            left.ReceiversReleased + right.ReceiversReleased,
            left.UnconsumedDeliveries + right.UnconsumedDeliveries,
            left.Failed + right.Failed
        );

    /// <summary>Whether this pass has anything worth reporting.</summary>
    public bool IsEmpty => Closed == 0 && Failed == 0;
}

/// <summary>
/// Outcome of closing a mailbox.
/// </summary>
internal abstract record MailboxCloseResult
{
    private MailboxCloseResult() { }

    /// <summary>
    /// Publishes whatever telemetry this outcome owes, and nothing when it owes none. Call it once, after
    /// the transaction that produced it has committed.
    /// </summary>
    public virtual void Record() { }

    /// <summary>
    /// This call closed the mailbox, releasing every receiver parked on it in the same transaction. Each
    /// of them runs the no-delivery path and concludes in the app's own words; the count tells an
    /// operator whether anybody was still waiting when the exchange ended.
    /// </summary>
    internal sealed record Closed(MailboxResponse Mailbox, MailboxReleaseCounts Released) : MailboxCloseResult
    {
        /// <summary>
        /// Counts the closure and the receivers it released together, because they are one event. The
        /// reason is read from the row that was actually written rather than from the parameter that
        /// asked for it, so the tag can never describe a close this call did not perform.
        /// </summary>
        /// <remarks>
        /// The pattern match cannot fail: <c>ck_mailboxes_disposal_is_complete</c> is biconditional, so a
        /// disposed mailbox always carries a reason and this record is only ever built from one. It is
        /// written as a match rather than asserted, because a metric is the wrong place to discover that
        /// the constraint was weakened.
        /// </remarks>
        public override void Record()
        {
            if (Mailbox.DisposedReason is { } reason)
            {
                Metrics.MailboxesClosed.Add(
                    1,
                    new KeyValuePair<string, object?>("reason", MailboxStatusMap.ToDbValue(reason))
                );
            }

            Released.Record();
        }
    }

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
    /// <paramref name="ReleasedReceiver"/> says whether a receiver was parked at that position and was
    /// woken in the same transaction — bookkeeping for the release metric, not a difference the caller
    /// answers differently: acceptance is not consumption, and a message that arrives before its receiver
    /// is as accepted as one that arrives after it.
    /// </summary>
    internal sealed record Accepted(MailboxDeliveryResponse Delivery, bool ReleasedReceiver) : MailboxDeliveryResult;

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
