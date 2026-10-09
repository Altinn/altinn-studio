using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

/// <summary>
/// Finishes a process-end workflow whose <see cref="CommitProcessState"/> kept <c>processing</c> for the steps
/// after it: stages the configured process-end cleanup and <c>processing</c> → <c>idle</c> in one save.
/// </summary>
internal sealed class ReleaseEndedInstance(IAppMetadata appMetadata) : IWorkflowEngineCommand
{
    public static string Key => "ReleaseEndedInstance";

    public string GetKey() => Key;

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        if (parameters.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "Releasing the instance requires callback state restored into an InstanceDataUnitOfWork.",
                nameof(InvalidOperationException)
            );
        }

        if (unitOfWork.Instance.Process?.Ended is null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "Releasing an ended instance requires an ended process state.",
                nameof(InvalidOperationException)
            );
        }

        try
        {
            await CommitProcessState.StageRelease(unitOfWork, appMetadata);
            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
