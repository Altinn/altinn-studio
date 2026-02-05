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

        /// <summary>
        /// Returns true if the step is done (either completed, canceled, or failed).
        /// </summary>
        public bool IsDone() => step.Status.IsDone();

        /// <summary>
        /// Returns true if the step is <i>not</i> complete (takes into consideration any waiting tasks).
        /// </summary>
        public bool IsIncomplete() => !step.IsDone() || step.DatabaseTask is not null || step.ExecutionTask is not null;

        /// <summary>
        /// Returns true if the step is complete (takes into consideration any waiting tasks).
        /// </summary>
        public bool IsComplete() => !step.IsIncomplete();

        /// <summary>
        /// Returns the amount of time a step spent waiting in the queue before being picked up by a worker.
        /// Takes into consideration <see cref="Step.StartAt"/> and <see cref="Step.BackoffUntil"/> constraints.
        /// </summary>
        public TimeSpan GetQueueDeltaTime(TimeProvider timeProvider)
        {
            List<DateTimeOffset?> candidates = [step.CreatedAt, step.StartAt, step.BackoffUntil];
            DateTimeOffset latest = candidates.OfType<DateTimeOffset>().Max();

            return timeProvider.GetUtcNow().Subtract(latest);
        }

        /// <summary>
        /// Step metadata useful for enriching telemetry activities.
        /// </summary>
        /// <returns></returns>
        public (string key, object? value)[] GetActivityTags() =>
            [
                ("step.database.id", step.DatabaseId),
                ("step.actor.id", step.Actor.UserIdOrOrgNumber),
                ("step.idempotency.key", step.IdempotencyKey),
                ("step.operation.id", step.OperationId),
                ("step.command.type", step.Command.GetType()),
            ];

        /// <summary>
        /// Step metadata useful for enriching telemetry histograms.
        /// </summary>
        public (string key, object? value)[] GetHistorgramTags() =>
            [
                ("operation.type", step.Command.GetType().Name),
                ("operation.id", step.Command.OperationId),
                ("operation.order", step.ProcessingOrder),
            ];
    }
}
