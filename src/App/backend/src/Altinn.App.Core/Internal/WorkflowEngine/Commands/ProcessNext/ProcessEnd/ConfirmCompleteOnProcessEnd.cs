using Altinn.App.Core.Internal.Data;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

/// <summary>
/// Confirms the instance as complete for the service owner, for an app that sets <c>onProcessEnd.confirm</c>. A step of
/// its own before <see cref="ReleaseProcessingStatus"/>, because Storage refuses a confirmation in the save that
/// hard-deletes the instance, as the release does with <c>autoDeleteOnProcessEnd</c>.
/// </summary>
internal sealed class ConfirmCompleteOnProcessEnd : IWorkflowEngineCommand
{
    public static string Key => "ConfirmCompleteOnProcessEnd";

    public string GetKey() => Key;

    public Task<WorkflowEngineCommandResult> Execute(WorkflowEngineCommandContext parameters)
    {
        if (parameters.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            return Task.FromResult<WorkflowEngineCommandResult>(
                FailedWorkflowEngineCommandResult.Permanent(
                    "Confirming completion on process end requires callback state restored into an InstanceDataUnitOfWork.",
                    nameof(InvalidOperationException)
                )
            );
        }

        if (unitOfWork.Instance.Process?.Ended is null)
        {
            return Task.FromResult<WorkflowEngineCommandResult>(
                FailedWorkflowEngineCommandResult.Permanent(
                    "Confirming completion on process end requires an ended process state.",
                    nameof(InvalidOperationException)
                )
            );
        }

        unitOfWork.AddCompleteConfirmation();
        return Task.FromResult<WorkflowEngineCommandResult>(new SuccessfulWorkflowEngineCommandResult());
    }
}
