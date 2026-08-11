using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Enums;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Acquires workflow ownership by staging the idle-to-processing status transition.
/// </summary>
internal sealed class AcquireProcessingStatus : IWorkflowEngineCommand
{
    public static string Key => "AcquireProcessingStatus";

    internal const string ConcurrencyFailureCode = "acquireConcurrencyConflict";

    public string GetKey() => Key;

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
    {
        if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Workflow process status acquisition requires callback state restored into an InstanceDataUnitOfWork.",
                    nameof(InvalidOperationException)
                )
            );
        }

        if (unitOfWork.Instance.Process is not { } process)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Workflow process status acquisition requires an initialized process state.",
                    nameof(InvalidOperationException)
                )
            );
        }

        try
        {
            unitOfWork.TransitionProcessStatus(ProcessStatus.Idle, ProcessStatus.Processing);
            process.Status = ProcessStatus.Processing;
            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
        catch (Exception exception)
        {
            return Task.FromResult<ProcessEngineCommandResult>(FailedProcessEngineCommandResult.Retryable(exception));
        }
    }
}
