using Altinn.App.Core.Internal.Data;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

/// <summary>
/// Confirms the instance as complete for the service owner. Planned for an app that sets
/// <c>autoConfirmCompleteOnProcessEnd</c>, and when the service task whose success ends the process delivered the
/// instance to the service owner. It runs after <see cref="DeleteDataOnProcessEnd"/>, so the
/// confirmation is the last change before the release: the process-ended hook and the data deletion can still
/// change the instance, and a failure in either leaves it unconfirmed until resumed. A step of its own rather than
/// part of the release, because Storage refuses a confirmation in the save that hard-deletes the instance: with the
/// application's own <c>autoDeleteOnProcessEnd</c>, <see cref="ReleaseProcessingStatus"/> hard-deletes the confirmed
/// instance in the next save.
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

        // Staged, so it commits with this step's workflow-owned save, the only kind Storage accepts it in.
        unitOfWork.AddCompleteConfirmation();
        return Task.FromResult<WorkflowEngineCommandResult>(new SuccessfulWorkflowEngineCommandResult());
    }
}
