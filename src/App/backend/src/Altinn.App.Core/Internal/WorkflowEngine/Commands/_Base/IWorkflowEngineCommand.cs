using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Represents a command that can be executed by the Process Engine with a typed request payload.
/// </summary>
/// <typeparam name="TRequestPayload">The type of the request payload this command expects.</typeparam>
/// <remarks>
/// <strong>IMPORTANT: All implementations MUST be idempotent - commands may be retried on failure.</strong>
/// </remarks>
internal interface IWorkflowEngineCommand<in TRequestPayload> : IWorkflowEngineCommand
    where TRequestPayload : CommandRequestPayload
{
    Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context, TRequestPayload payload);
}
