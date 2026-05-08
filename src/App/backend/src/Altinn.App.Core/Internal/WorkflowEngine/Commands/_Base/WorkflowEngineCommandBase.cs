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
