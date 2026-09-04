using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Enums;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Takes over workflow ownership from a written-off workflow by staging a processing-to-processing status
/// transition, fenced by the same version preconditions and idempotency key as an acquire.
/// </summary>
/// <remarks>
/// Temporary workaround. A bpmn-allowed reject must supersede a terminally failed workflow that still holds
/// <c>processing</c>, but Storage's process status carries no owner identity, so the takeover cannot be verified at
/// the Storage boundary: the version fences prove the snapshot is current, not that the abandoned workflow is the
/// holder. If the reject's enqueue fails after the abandon, the instance is left "processing with no owner" and no
/// repair path exists yet. The processing-status ownership model has to be redesigned for a robust solution.
/// </remarks>
internal sealed class TakeOverProcessingStatus : IWorkflowEngineCommand
{
    public static string Key => "TakeOverProcessingStatus";

    public string GetKey() => Key;

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
    {
        if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Workflow process status takeover requires callback state restored into an InstanceDataUnitOfWork.",
                    nameof(InvalidOperationException)
                )
            );
        }

        if (unitOfWork.Instance.Process is not { } process)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Workflow process status takeover requires an initialized process state.",
                    nameof(InvalidOperationException)
                )
            );
        }

        try
        {
            unitOfWork.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Processing);
            process.Status = ProcessStatus.Processing;
            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
        catch (Exception exception)
        {
            return Task.FromResult<ProcessEngineCommandResult>(FailedProcessEngineCommandResult.Retryable(exception));
        }
    }
}
