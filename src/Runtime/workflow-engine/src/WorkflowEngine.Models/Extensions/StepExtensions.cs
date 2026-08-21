namespace WorkflowEngine.Models.Extensions;

/// <summary>
/// Helpers for projecting <see cref="Step"/> data into telemetry tags, and for the derived wait values
/// that depend on engine configuration.
/// </summary>
public static class StepExtensions
{
    /// <summary>
    /// The instant a step's retry allowance is measured from: the step's last deferral when it has
    /// one (so a long wait does not consume the retry budget), otherwise the previous step's
    /// completion, otherwise the step's creation. Deliberately never <c>UpdatedAt</c>, which
    /// advances on every write-back and would slide the retry deadline forward per attempt until
    /// <see cref="Resilience.Models.RetryStrategy.MaxDuration"/> stops binding.
    /// This field-level overload exists so callers that load the anchor inputs without hydrating
    /// full <see cref="Step"/> models (e.g. the throttle sweep's park-candidate query) share the
    /// exact same rule as the workflow handler.
    /// </summary>
    public static DateTimeOffset ResolveRetryAnchor(
        DateTimeOffset? lastDeferredAt,
        DateTimeOffset? previousStepUpdatedAt,
        DateTimeOffset stepCreatedAt
    ) => lastDeferredAt ?? previousStepUpdatedAt ?? stepCreatedAt;

    extension(Step step)
    {
        /// <summary>
        /// The instant this step's retry allowance is measured from. See
        /// <see cref="StepExtensions.ResolveRetryAnchor(DateTimeOffset?, DateTimeOffset?, DateTimeOffset)"/>.
        /// </summary>
        public DateTimeOffset ResolveRetryAnchor(Step? previousStep) =>
            ResolveRetryAnchor(step.LastDeferredAt, previousStep?.UpdatedAt, step.CreatedAt);

        /// <summary>
        /// The step's effective wait budget: its command's <see cref="CommandDefinition.WaitBudget"/>,
        /// or the engine default when the command does not specify one.
        /// </summary>
        public TimeSpan ResolveWaitBudget(EngineSettings settings) =>
            step.Command.WaitBudget ?? settings.DefaultStepWaitBudget;

        /// <summary>
        /// The absolute instant the step's wait budget runs out, or <c>null</c> before its first deferral
        /// — nothing is being waited on yet, so the whole budget is still ahead of it.
        /// </summary>
        public DateTimeOffset? ResolveWaitDeadline(EngineSettings settings) =>
            step.FirstDeferredAt?.Add(step.ResolveWaitBudget(settings));

        /// <summary>
        /// Step metadata useful for enriching telemetry activities.
        /// </summary>
        public (string key, object? value)[] GetActivityTags() =>
            [
                ("step.database.id", step.DatabaseId),
                ("step.operation.id", step.OperationId),
                ("step.command.type", step.Command.Type),
            ];

        /// <summary>
        /// Step metadata useful for enriching telemetry histograms.
        /// </summary>
        public (string key, object? value)[] GetHistogramTags() =>
            [
                ("operation.type", step.Command.Type),
                ("operation.id", step.OperationId),
                ("operation.order", step.ProcessingOrder),
            ];
    }
}
