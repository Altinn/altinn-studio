using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Represents a command that can be executed by the workflow engine.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: All implementations MUST be idempotent - commands may be retried on failure.</strong>
/// </remarks>
internal interface IWorkflowEngineCommand
{
    string GetKey();

    Task<WorkflowEngineCommandResult> Execute(WorkflowEngineCommandContext context);

    /// <summary>
    /// The command's default per-step execution options (timeout / retry strategy). This is the middle
    /// resolution tier: it overrides the engine's global defaults but is itself overridden by the options the
    /// step's handler or pipeline item declared. Null (the default) means
    /// the command has no opinion and the engine's global defaults apply.
    /// </summary>
    ProcessStepOptions? DefaultStepOptions => null;
}

/// <summary>
/// Represents a command that can be executed by the workflow engine with a typed request payload.
/// </summary>
/// <typeparam name="TRequestPayload">The type of the request payload this command expects.</typeparam>
/// <remarks>
/// <strong>IMPORTANT: All implementations MUST be idempotent - commands may be retried on failure.</strong>
/// </remarks>
internal interface IWorkflowEngineCommand<in TRequestPayload> : IWorkflowEngineCommand
    where TRequestPayload : CommandRequestPayload
{
    Task<WorkflowEngineCommandResult> Execute(WorkflowEngineCommandContext context, TRequestPayload payload);
}
