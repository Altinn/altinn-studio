using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for CommitProcessState command.
/// Contains the complete process state change with old and new states.
/// </summary>
internal sealed record ProcessStateChangePayload(ProcessStateChange ProcessStateChange) : CommandRequestPayload;

/// <summary>
/// Command that stages the process state transition for the callback controller's workflow-owned Storage save.
/// </summary>
internal sealed class CommitProcessState : WorkflowEngineCommandBase<ProcessStateChangePayload>
{
    public static string Key => "CommitProcessState";

    public override string GetKey() => Key;

    public override Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessStateChangePayload toStoragePayload
    )
    {
        try
        {
            ProcessStateChange processStateChange = toStoragePayload.ProcessStateChange;

            if (processStateChange.NewProcessState == null)
            {
                return Task.FromResult<ProcessEngineCommandResult>(
                    FailedProcessEngineCommandResult.Permanent(
                        "ProcessStateChange.NewProcessState is null",
                        "InvalidOperationException"
                    )
                );
            }

            if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
            {
                return Task.FromResult<ProcessEngineCommandResult>(
                    FailedProcessEngineCommandResult.Permanent(
                        "Workflow process state save requires callback state restored into an InstanceDataUnitOfWork.",
                        "InvalidOperationException"
                    )
                );
            }

            Instance instance = unitOfWork.Instance;
            instance.Process = processStateChange.NewProcessState;
            unitOfWork.StageProcessStateChange(processStateChange);

            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
        catch (Exception ex)
        {
            return Task.FromResult<ProcessEngineCommandResult>(FailedProcessEngineCommandResult.Retryable(ex));
        }
    }
}
