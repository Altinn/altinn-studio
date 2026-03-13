namespace WorkflowEngine.Models.Extensions;

public static class StepExtensions
{
    extension(Step step)
    {
        /// <summary>
        /// Step metadata useful for enriching telemetry activities.
        /// </summary>
        /// <returns></returns>
        public (string key, object? value)[] GetActivityTags() =>
            [
                ("step.database.id", step.DatabaseId),
                ("step.actor.id", step.Actor.UserIdOrOrgNumber),
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
