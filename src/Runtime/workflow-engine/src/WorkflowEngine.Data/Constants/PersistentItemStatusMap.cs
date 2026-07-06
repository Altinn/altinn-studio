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
    /// Renders a status set as a comma-separated list of integer literals, in ascending order
    /// (e.g. <c>"3, 4, 5, 6, 7"</c>), for interpolation into raw SQL <c>IN (...)</c> clauses and
    /// partial index filters. Every raw-SQL status list must derive from the same map property
    /// via this method so the sets cannot drift apart when a status is added.
    /// </summary>
    public static string ToSqlList(IReadOnlyCollection<PersistentItemStatus> statuses) =>
        string.Join(", ", statuses.Select(s => (int)s).Order());
}
