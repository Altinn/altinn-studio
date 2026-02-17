namespace WorkflowEngine.Models.Extensions;

public static class WorkflowExtensions
{
    extension(Workflow workflow)
    {
        /// <summary>
        /// Returns true if the workflow is done (either completed, canceled, or failed).
        /// </summary>
        public bool IsDone() => workflow.Status.IsDone();

        /// <summary>
        /// Returns the status of the database update task.
        /// </summary>
        public TaskStatus DatabaseUpdateStatus() => workflow.DatabaseTask.Status();

        /// <summary>
        /// Cleans up and disposes of the database task.
        /// </summary>
        public void CleanupDatabaseTask()
        {
            workflow.DatabaseTask?.Dispose();
            workflow.DatabaseTask = null;
        }

        /// <summary>
        /// The list of workflow steps ordered by processing order.
        /// </summary>
        public IEnumerable<Step> OrderedSteps() => workflow.Steps.OrderBy(t => t.ProcessingOrder);

        /// <summary>
        /// A list of workflow steps that are incomplete (not completed, canceled, or failed), ordered by processing order.
        /// </summary>
        public IEnumerable<Step> OrderedIncompleteSteps() =>
            workflow.Steps.Where(x => x.IsIncomplete()).OrderBy(x => x.ProcessingOrder);

        /// <summary>
        /// The overall workflow status (based on step statuses)
        /// </summary>
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

        /// <summary>
        /// Returns true if the workflow has any steps ready for execution.
        /// </summary>
        public bool IsReadyForExecution(DateTimeOffset now)
        {
            if (workflow.StartAt > now)
                return false;

            return workflow.OrderedIncompleteSteps().FirstOrDefault()?.IsReadyForExecution(now) ?? true;
        }

        /// <summary>
        /// Returns true if the workflow has any steps ready for execution.
        /// </summary>
        public bool IsReadyForExecution(TimeProvider timeProvider) =>
            workflow.IsReadyForExecution(timeProvider.GetUtcNow());

        /// <summary>
        /// Workflow metadata useful for enriching telemetry activities.
        /// </summary>
        public (string key, object? value)[] GetActivityTags() =>
            [
                ("workflow.actor.id", workflow.Actor.UserIdOrOrgNumber),
                ("workflow.database.id", workflow.DatabaseId),
                ("workflow.idempotency.key", workflow.IdempotencyKey),
                ("workflow.operation.id", workflow.OperationId),
                ("workflow.instance.guid", workflow.InstanceInformation.InstanceGuid),
                ("workflow.instance.party.id", workflow.InstanceInformation.InstanceOwnerPartyId),
                ("workflow.instance.lock.key", workflow.InstanceLockKey),
                ("workflow.instance.app", $"{workflow.InstanceInformation.Org}/{workflow.InstanceInformation.App}"),
            ];

        /// <summary>
        /// Step metadata useful for enriching telemetry histograms.
        /// </summary>
        public (string key, object? value)[] GetHistorgramTags() => [("workflow.operation.id", workflow.OperationId)];
    }
}
