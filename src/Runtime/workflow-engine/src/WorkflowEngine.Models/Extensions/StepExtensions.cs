namespace WorkflowEngine.Models.Extensions;

/// <summary>
/// Helpers for projecting <see cref="Step"/> data into telemetry tags.
/// </summary>
public static class StepExtensions
{
    extension(Step step)
    {
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
