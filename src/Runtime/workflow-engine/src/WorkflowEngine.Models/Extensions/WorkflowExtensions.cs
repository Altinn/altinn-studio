namespace WorkflowEngine.Models.Extensions;

/// <summary>
/// Helpers for inspecting and projecting <see cref="Workflow"/> data.
/// </summary>
public static class WorkflowExtensions
{
    extension(Workflow workflow)
    {
        /// <summary>
        /// Returns true if the workflow is done (either completed, canceled, or failed).
        /// </summary>
        public bool IsDone() => workflow.Status.IsDone();

        /// <summary>
        /// The list of workflow steps ordered by processing order.
        /// </summary>
        public IEnumerable<Step> OrderedSteps() => workflow.Steps.OrderBy(t => t.ProcessingOrder);

        /// <summary>
        /// The overall workflow status (based on step statuses)
        /// </summary>
        public PersistentItemStatus OverallStatus()
        {
            if (workflow.Steps.All(t => t.Status == PersistentItemStatus.Completed))
                return PersistentItemStatus.Completed;

            if (workflow.Steps.Any(t => t.Status == PersistentItemStatus.Failed))
                return PersistentItemStatus.Failed;

            if (workflow.Steps.Any(t => t.Status == PersistentItemStatus.DependencyFailed))
                return PersistentItemStatus.DependencyFailed;

            if (workflow.Steps.Any(t => t.Status == PersistentItemStatus.Canceled))
                return PersistentItemStatus.Canceled;

            if (workflow.Steps.Any(t => t.Status == PersistentItemStatus.Requeued))
                return PersistentItemStatus.Requeued;

            return workflow.Steps.Any(t => t.Status != PersistentItemStatus.Enqueued)
                ? PersistentItemStatus.Processing
                : PersistentItemStatus.Enqueued;
        }

        /// <summary>
        /// Workflow metadata useful for enriching telemetry activities.
        /// </summary>
        public (string key, object? value)[] GetActivityTags() =>
            [
                ("workflow.database.id", workflow.DatabaseId),
                ("workflow.collection.key", workflow.CollectionKey),
                ("workflow.idempotency.key", workflow.IdempotencyKey),
                ("workflow.operation.id", workflow.OperationId),
                ("workflow.namespace", workflow.Namespace),
            ];

        /// <summary>
        /// Step metadata useful for enriching telemetry histograms.
        /// </summary>
        public (string key, object? value)[] GetHistogramTags() => [("workflow.operation.id", workflow.OperationId)];
    }
}
