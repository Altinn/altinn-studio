using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Extensions;

/// <summary>
/// Projects the engine's models into the attributes its telemetry carries.
/// </summary>
/// <remarks>
/// Here rather than beside the models: <c>WorkflowEngine.Models</c> is the dependency-free wire contract, so it
/// cannot see <see cref="TelemetryAttributes"/>.
/// </remarks>
internal static class TelemetryTagExtensions
{
    extension(Workflow workflow)
    {
        /// <summary>
        /// The attributes on a workflow's entry span: its IDs, the caller's keys and its namespace.
        /// </summary>
        public (string key, object? value)[] GetActivityTags() =>
            [
                (TelemetryAttributes.WorkflowId, workflow.DatabaseId),
                (TelemetryAttributes.CollectionKey, workflow.CollectionKey),
                (TelemetryAttributes.WorkflowIdempotencyKey, workflow.IdempotencyKey),
                (TelemetryAttributes.WorkflowOperationId, workflow.OperationId),
                (TelemetryAttributes.Namespace, workflow.Namespace),
            ];
    }

    extension(Step step)
    {
        /// <summary>
        /// The attributes on a step's span: its IDs and the type of command it runs.
        /// </summary>
        public (string key, object? value)[] GetActivityTags() =>
            [
                (TelemetryAttributes.StepId, step.DatabaseId),
                (TelemetryAttributes.StepOperationId, step.OperationId),
                (TelemetryAttributes.StepCommandType, step.Command.Type),
            ];

        /// <summary>
        /// The attributes on a step's duration histograms: only the command type, which every app shares — an
        /// operation ID is built per app, so it would make the series unbounded across the fleet.
        /// </summary>
        public (string key, object? value)[] GetHistogramTags() =>
            [(TelemetryAttributes.StepCommandType, step.Command.Type)];
    }
}
