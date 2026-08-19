using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Constants;

internal static class PersistentItemStatusMap
{
    /// <summary>
    /// Non-terminal states — work that is still in flight. Includes
    /// <see cref="PersistentItemStatus.Held"/>: a held workflow has not started and no worker will ever
    /// claim it, but it is unsettled, so this set is deliberately wider than the fetch gate's status
    /// list (<see cref="Fetchable"/>).
    /// </summary>
    /// <remarks>
    /// This set is <em>enqueue admission control</em>, not only a read filter: <c>MetricsCollector</c>
    /// derives the active-workflow count from it, and the engine rejects enqueues with
    /// <c>AtCapacity</c> (HTTP 429) once that count reaches
    /// <see cref="ConcurrencySettings.BackpressureThreshold"/>. A held mailbox receiver therefore
    /// consumes admission budget for as long as its mailbox stays open (up to
    /// <see cref="EngineSettings.MaxMailboxTimeout"/>). <see cref="PersistentItemStatus.Waiting"/>
    /// already behaves this way, so this is consistent in kind — but a parked step resolves on its own
    /// timer where a held receiver waits on someone else. Whether <c>active</c> should mean this set or
    /// <see cref="Fetchable"/> ∪ {<c>Processing</c>} is an open question, deliberately not settled here.
    /// </remarks>
    public static IReadOnlyCollection<PersistentItemStatus> Incomplete =>
        [
            PersistentItemStatus.Enqueued,
            PersistentItemStatus.Processing,
            PersistentItemStatus.Requeued,
            PersistentItemStatus.Waiting,
            PersistentItemStatus.Held,
        ];

    /// <summary>
    /// The statuses the fetch gate can claim — the subset of <see cref="Incomplete"/> a worker will ever
    /// pick up. Deliberately excludes <see cref="PersistentItemStatus.Processing"/> (already claimed) and
    /// <see cref="PersistentItemStatus.Held"/> (born parked, released only by the event it waits on).
    /// </summary>
    /// <remarks>
    /// The <c>ix_workflows_backoff_until_created_at</c> partial index reads this set through
    /// <see cref="FetchableSqlList"/>, so the filter and the set cannot drift.
    /// <para>
    /// <c>FetchAndLockWorkflows</c> does <em>not</em>: it spells the three statuses out itself, as
    /// interpolated <em>parameters</em> rather than literals. That is not a planner requirement —
    /// PostgreSQL matches a partial index by proving the query predicate implies the index filter, so a
    /// parameterized <c>status IN (…)</c> uses a literal index filter perfectly well. It is because the
    /// gate's SQL text is deliberately held byte-stable: it is the hottest statement in the engine, its
    /// plan is snapshot-pinned, and a status set that silently reshaped it would change the plan without
    /// changing any test's intent.
    /// </para>
    /// <para>
    /// <strong>The gate's own list is therefore an unpinned restatement of this set, kept in step by
    /// review rather than by a test.</strong> Nothing catches a status added to the gate and not here;
    /// what that would break is everything reading this set — <c>GetRunnableWorkflows</c> would
    /// under-report, and the partial index would stop covering the gate. New SQL has no reason to
    /// hand-write status literals: read this set.
    /// </para>
    /// </remarks>
    public static IReadOnlyCollection<PersistentItemStatus> Fetchable =>
        [PersistentItemStatus.Enqueued, PersistentItemStatus.Requeued, PersistentItemStatus.Waiting];

    public static IReadOnlyCollection<PersistentItemStatus> Successful => [PersistentItemStatus.Completed];

    /// <summary>
    /// Unsuccessful terminal states that condemn dependents to <see cref="PersistentItemStatus.DependencyFailed"/>.
    /// <see cref="PersistentItemStatus.Abandoned"/> is deliberately absent: an abandoned workflow is
    /// terminal but its failure has been written off, so it no longer gates anything.
    /// </summary>
    public static IReadOnlyCollection<PersistentItemStatus> Failed =>
        [PersistentItemStatus.Canceled, PersistentItemStatus.Failed, PersistentItemStatus.DependencyFailed];

    public static IReadOnlyCollection<PersistentItemStatus> Finished =>
        [.. Successful, .. Failed, PersistentItemStatus.Abandoned];

    /// <summary>
    /// <see cref="Finished"/> as a comma-separated list of integer literals, for interpolation into
    /// raw SQL <c>IN (...)</c> clauses and partial index filters. A compile-time constant so the
    /// interpolating command texts stay constant too (CA2100 requires provably-constant SQL);
    /// PersistentItemStatusMapTests pins it to <see cref="ToSqlList"/> of the map property.
    /// </summary>
    public const string FinishedSqlList = "3, 4, 5, 6, 7";

    /// <summary>
    /// <see cref="Incomplete"/> as a comma-separated list of integer literals.
    /// Same constancy contract as <see cref="FinishedSqlList"/>.
    /// </summary>
    public const string IncompleteSqlList = "0, 1, 2, 8, 9";

    /// <summary>
    /// <see cref="Fetchable"/> as a comma-separated list of integer literals, interpolated into the
    /// <c>ix_workflows_backoff_until_created_at</c> partial index filter so the index the fetch gate
    /// relies on is defined by the same set every other reader consults.
    /// Same constancy contract as <see cref="FinishedSqlList"/>.
    /// </summary>
    public const string FetchableSqlList = "0, 2, 8";

    /// <summary>
    /// Renders a status set as a comma-separated list of integer literals, in ascending order
    /// (e.g. <c>"3, 4, 5, 6, 7"</c>). Raw SQL interpolates the <c>*SqlList</c> constants above
    /// (which tests pin to this rendering) so the sets cannot drift apart when a status is added.
    /// </summary>
    public static string ToSqlList(IReadOnlyCollection<PersistentItemStatus> statuses) =>
        string.Join(", ", statuses.Select(s => (int)s).Order());
}
