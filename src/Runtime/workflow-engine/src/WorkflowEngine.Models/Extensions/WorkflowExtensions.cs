namespace WorkflowEngine.Models.Extensions;

public static class WorkflowExtensions
{
    extension(Workflow workflow)
    {
        public bool IsDone() => workflow.Status.IsDone();

        public TaskStatus DatabaseUpdateStatus() => workflow.DatabaseTask.Status();

        public void CleanupDatabaseTask()
        {
            workflow.DatabaseTask?.Dispose();
            workflow.DatabaseTask = null;
        }

        public IEnumerable<Step> OrderedTasks() => workflow.Steps.OrderBy(t => t.ProcessingOrder);

        public IEnumerable<Step> OrderedIncompleteTasks() =>
            workflow
                .Steps.Where(x => !x.IsDone() || x.DatabaseTask is not null || x.ExecutionTask is not null)
                .OrderBy(x => x.ProcessingOrder);

        public PersistentItemStatus OverallStatus()
        {
            if (workflow.Steps.All(t => t.Status == PersistentItemStatus.Completed))
                return PersistentItemStatus.Completed;

            if (workflow.Steps.Any(t => t.Status == PersistentItemStatus.Failed))
                return PersistentItemStatus.Failed;

            if (workflow.Steps.Any(t => t.Status == PersistentItemStatus.Canceled))
                return PersistentItemStatus.Canceled;

            return workflow.Steps.Any(t => t.Status != PersistentItemStatus.Enqueued)
                ? PersistentItemStatus.Processing
                : PersistentItemStatus.Enqueued;
        }

        public bool IsReadyForExecution(DateTimeOffset now) =>
            !workflow.BackoffUntil.HasValue || now >= workflow.BackoffUntil;

        public bool IsReadyForExecution(TimeProvider timeProvider) =>
            workflow.IsReadyForExecution(timeProvider.GetUtcNow());
    }
}
