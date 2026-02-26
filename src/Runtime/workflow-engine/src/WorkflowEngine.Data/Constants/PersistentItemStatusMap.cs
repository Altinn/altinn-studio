using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Constants;

public static class PersistentItemStatusMap
{
    public static IReadOnlyCollection<PersistentItemStatus> Incomplete =>
        [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued];

    public static IReadOnlyCollection<PersistentItemStatus> Successful => [PersistentItemStatus.Completed];

    public static IReadOnlyCollection<PersistentItemStatus> Failed =>
        [PersistentItemStatus.Canceled, PersistentItemStatus.Failed, PersistentItemStatus.DependencyFailed];
}
