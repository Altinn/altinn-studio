using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Constants;

internal static class PersistentItemStatusMap
{
    public static IReadOnlyCollection<PersistentItemStatus> Incomplete =>
        [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued];

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
    public const string IncompleteSqlList = "0, 1, 2";

    /// <summary>
    /// Renders a status set as a comma-separated list of integer literals, in ascending order
    /// (e.g. <c>"3, 4, 5, 6, 7"</c>). Raw SQL interpolates the <c>*SqlList</c> constants above
    /// (which tests pin to this rendering) so the sets cannot drift apart when a status is added.
    /// </summary>
    public static string ToSqlList(IReadOnlyCollection<PersistentItemStatus> statuses) =>
        string.Join(", ", statuses.Select(s => (int)s).Order());
}
