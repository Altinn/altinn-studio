namespace WorkflowEngine.Models.Extensions;

public static class WorkflowEngineItemStatusExtensions
{
    extension(PersistentItemStatus status)
    {
        public bool IsDone() =>
            status
                is PersistentItemStatus.Completed
                    or PersistentItemStatus.Failed
                    or PersistentItemStatus.Canceled
                    or PersistentItemStatus.DependencyFailed;

        public bool IsSuccessful() => status is PersistentItemStatus.Completed;
    }
}
