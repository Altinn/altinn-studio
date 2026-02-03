namespace WorkflowEngine.Models.Extensions;

public static class WorkflowEngineItemStatusExtensions
{
    extension(PersistentItemStatus status)
    {
        public bool IsDone() =>
            status is PersistentItemStatus.Completed or PersistentItemStatus.Failed or PersistentItemStatus.Canceled;

        public bool IsSuccessful() => status is PersistentItemStatus.Completed;
    }
}
