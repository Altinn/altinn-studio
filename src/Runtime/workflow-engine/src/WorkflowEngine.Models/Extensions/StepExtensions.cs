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

            if (step.StartAt.HasValue && step.StartAt > now)
                return false;

            return true;
        }

        public bool IsReadyForExecution(TimeProvider timeProvider) =>
            step.IsReadyForExecution(timeProvider.GetUtcNow());

        public bool IsDone() => step.Status.IsDone();

        /// <summary>
        /// Returns the duration a step spent waiting in the queue before being picked up by a worker.
        /// Takes into consideration <see cref="Step.StartAt"/> and <see cref="Step.BackoffUntil"/> constraints.
        /// </summary>
        public TimeSpan GetQueueDeltaTime(TimeProvider timeProvider)
        {
            List<DateTimeOffset?> candidates = [step.FirstSeenAt, step.StartAt, step.BackoffUntil];
            DateTimeOffset latest = candidates.OfType<DateTimeOffset>().Max();

            return timeProvider.GetUtcNow().Subtract(latest);
        }
    }
}
