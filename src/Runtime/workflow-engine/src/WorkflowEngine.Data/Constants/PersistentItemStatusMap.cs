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
}
