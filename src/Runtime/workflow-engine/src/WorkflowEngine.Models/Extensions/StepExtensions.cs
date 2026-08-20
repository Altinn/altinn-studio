namespace WorkflowEngine.Models.Extensions;

/// <summary>
/// Helpers for projecting <see cref="Step"/> data into telemetry tags, and for the derived wait values
/// that depend on engine configuration.
/// </summary>
public static class StepExtensions
{
    extension(Step step)
    {
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
