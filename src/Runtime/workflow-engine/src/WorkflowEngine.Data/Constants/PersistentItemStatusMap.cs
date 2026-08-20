using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Constants;

internal static class PersistentItemStatusMap
{
    /// <summary>
    /// Non-terminal states — work that is still in flight. Includes <see cref="PersistentItemStatus.Held"/>: a held
    /// workflow has not started and no worker will ever claim it, but it is unsettled, so this set is deliberately
    /// wider than the fetch gate's status list (<see cref="Fetchable"/>).
    /// </summary>
    /// <remarks>
    /// This set is enqueue admission control, not only a read filter: <c>MetricsCollector</c> derives the
    /// active-workflow count from it, and the engine rejects enqueues with <c>AtCapacity</c> once that count
    /// reaches <see cref="ConcurrencySettings.BackpressureThreshold"/>. A held mailbox receiver therefore consumes
    /// admission budget for as long as its mailbox stays open.
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
    /// The statuses the fetch gate can claim — the subset of <see cref="Incomplete"/> a worker will ever pick up.
    /// Deliberately excludes <see cref="PersistentItemStatus.Processing"/> (already claimed) and
    /// <see cref="PersistentItemStatus.Held"/> (born parked, released only by the event it waits on).
    /// </summary>
    /// <remarks>
    /// The <c>ix_workflows_backoff_until_created_at</c> partial index reads this set through
    /// <see cref="FetchableSqlList"/>, so the filter and the set cannot drift. <c>FetchAndLockWorkflows</c> does
    /// not: it spells the three statuses out itself, because the gate's SQL text is deliberately held byte-stable
    /// — it is the hottest statement in the engine and its plan is snapshot-pinned. That restatement is kept in
    /// step by review rather than by a test, so new SQL should read this set instead of hand-writing literals.
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
