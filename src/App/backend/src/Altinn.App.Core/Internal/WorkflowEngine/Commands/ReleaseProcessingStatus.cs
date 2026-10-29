using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Releases workflow ownership by staging the processing-to-idle status transition. The last step of every
/// process/next workflow that no service task continues. On an ended process with
/// <c>autoDeleteOnProcessEnd</c>, the same save hard-deletes the instance, the only shape Storage accepts
/// for a workflow-owned hard delete.
/// </summary>
internal sealed class ReleaseProcessingStatus(IAppMetadata appMetadata) : IWorkflowEngineCommand
{
    public static string Key => "ReleaseProcessingStatus";

    public string GetKey() => Key;

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
    {
        if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Workflow process status release requires callback state restored into an InstanceDataUnitOfWork.",
                    nameof(InvalidOperationException)
                )
            );
        }

        Instance instance = unitOfWork.Instance;
        if (instance.Process is not { } process)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Workflow process status release requires an initialized process state.",
                    nameof(InvalidOperationException)
                )
            );
        }

        try
        {
            if (process.Ended is not null && appMetadata.ApplicationMetadata.AutoDeleteOnProcessEnd == true)
            {
                unitOfWork.HardDeleteInstance();
            }

            unitOfWork.ReleaseProcessingStatus();
            process.Status = ProcessStatus.Idle;
            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
        catch (Exception ex)
        {
            return Task.FromResult<ProcessEngineCommandResult>(FailedProcessEngineCommandResult.Retryable(ex));
        }
    }
}
