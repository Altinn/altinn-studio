namespace WorkflowEngine.Models.Extensions;

public static class StepExtensions
{
    extension(Step step)
    {
        public TaskStatus ExecutionStatus() => step.ExecutionTask.Status();

        public TaskStatus DatabaseUpdateStatus() => step.DatabaseTask.Status();

        public void CleanupDatabaseTask()
        {
            step.DatabaseTask?.Dispose();
            step.DatabaseTask = null;
        }

        public void CleanupExecutionTask()
        {
            step.ExecutionTask?.Dispose();
            step.ExecutionTask = null;
        }

        public bool IsReadyForExecution(DateTimeOffset now)
        {
            if (step.BackoffUntil.HasValue && step.BackoffUntil > now)
                return false;

            if (step.StartTime.HasValue && step.StartTime > now)
                return false;

            return true;
        }

        public bool IsReadyForExecution(TimeProvider timeProvider) =>
            IsReadyForExecution(step, timeProvider.GetUtcNow());

        public bool IsDone() => step.Status.IsDone();
    }
}
