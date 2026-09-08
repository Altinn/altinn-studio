namespace WorkflowEngine.Models.Extensions;

/// <summary>
/// Convenience predicates over <see cref="PersistentItemStatus"/>.
/// </summary>
public static class WorkflowEngineItemStatusExtensions
{
    extension(PersistentItemStatus status)
    {
        /// <summary>
        /// Returns <c>true</c> when the status is terminal (completed, failed, canceled,
        /// dependency-failed, abandoned, or skipped).
        /// </summary>
        public bool IsDone() =>
            status
                is PersistentItemStatus.Completed
                    or PersistentItemStatus.Failed
                    or PersistentItemStatus.Canceled
                    or PersistentItemStatus.DependencyFailed
                    or PersistentItemStatus.Abandoned
                    or PersistentItemStatus.Skipped;

        /// <summary>
        /// Returns <c>true</c> when the status is <see cref="PersistentItemStatus.Completed"/>.
        /// </summary>
        public bool IsSuccessful() => status is PersistentItemStatus.Completed;
    }
}
