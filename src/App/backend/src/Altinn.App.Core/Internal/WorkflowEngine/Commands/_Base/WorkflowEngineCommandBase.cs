using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Base class for commands that require a typed payload.
/// Handles deserialization and validation of the payload before delegating to the typed Execute method.
/// </summary>
/// <typeparam name="TRequestPayload">The type of the request payload this command expects.</typeparam>
internal abstract class WorkflowEngineCommandBase<TRequestPayload> : IWorkflowEngineCommand<TRequestPayload>
    where TRequestPayload : CommandRequestPayload
{
    public abstract string GetKey();

    /// <summary>
    /// The command's default per-step execution options (tier 2). Concrete payload commands override
    /// this to declare a non-default timeout or retry strategy; the base returns null so the engine's
    /// global defaults apply. This surfaces the <see cref="IWorkflowEngineCommand.DefaultStepOptions"/>
    /// interface member as a virtual so derived commands can override it.
    /// </summary>
    public virtual ProcessStepOptions? DefaultStepOptions => null;

    Task<ProcessEngineCommandResult> IWorkflowEngineCommand.Execute(ProcessEngineCommandContext context)
    {
        TRequestPayload? payload = CommandPayloadSerializer.Deserialize<TRequestPayload>(context.Payload.Payload);

        if (payload is null)
        {
            string commandKey = GetKey();
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    $"{commandKey} payload is missing or invalid",
                    "InvalidPayloadException"
                )
            );
        }

        return Execute(context, payload);
    }

    public abstract Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        TRequestPayload payload
    );
}
