using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for CommitProcessState command.
/// Contains the complete process state change with old and new states.
/// </summary>
internal sealed record ProcessStateChangePayload(ProcessStateChange ProcessStateChange, bool ServiceTaskFollows = false)
    : CommandRequestPayload;

/// <summary>
/// Command that stages the process state transition for the callback controller's workflow-owned Storage save.
/// </summary>
internal sealed class CommitProcessState(IAppMetadata appMetadata)
    : WorkflowEngineCommandBase<ProcessStateChangePayload>
{
    public static string Key => "CommitProcessState";

    public override string GetKey() => Key;

    protected override ProcessStateChangePayload? ResolvePayload(ProcessEngineCommandContext context)
    {
        ProcessStateChangePayload? payload = base.ResolvePayload(context);
        return payload?.ProcessStateChange is null ? null : payload;
    }

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessStateChangePayload toStoragePayload
    )
    {
        try
        {
            ProcessStateChange processStateChange = toStoragePayload.ProcessStateChange;
            if (processStateChange.NewProcessState == null)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    "ProcessStateChange.NewProcessState is null",
                    "InvalidOperationException"
                );
            }

            ProcessState newProcessState = processStateChange.NewProcessState;
            if (newProcessState.Ended is null && newProcessState.CurrentTask is null)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    "A non-ended process state requires a current task.",
                    nameof(InvalidOperationException)
                );
            }

            if (newProcessState.Ended is not null)
            {
                if (newProcessState.CurrentTask is not null || string.IsNullOrWhiteSpace(newProcessState.EndEvent))
                {
                    return FailedProcessEngineCommandResult.Permanent(
                        "An ended process state requires no current task and a nonblank end event.",
                        nameof(InvalidOperationException)
                    );
                }
            }

            if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    "Workflow process state save requires callback state restored into an InstanceDataUnitOfWork.",
                    "InvalidOperationException"
                );
            }

            Instance instance = unitOfWork.Instance;
            newProcessState.Status = instance.Process?.Status;
            instance.Process = newProcessState;
            unitOfWork.UpdateProcessState(processStateChange);

            if (newProcessState.Ended is not null)
            {
                await StageProcessEndCleanup(unitOfWork);
            }

            if (!toStoragePayload.ServiceTaskFollows)
            {
                unitOfWork.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);
                instance.Process.Status = ProcessStatus.Idle;
            }

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private async Task StageProcessEndCleanup(InstanceDataUnitOfWork unitOfWork)
    {
        ApplicationMetadata applicationMetadata = await appMetadata.GetApplicationMetadata();
        HashSet<string> dataTypesToDelete = applicationMetadata
            .DataTypes.Where(dataType => dataType?.AppLogic?.AutoDeleteOnProcessEnd == true)
            .Select(dataType => dataType.Id)
            .ToHashSet(StringComparer.Ordinal);

        foreach (
            IGrouping<string, DataElement> elementsByDataType in unitOfWork
                .Instance.Data.Where(element => dataTypesToDelete.Contains(element.DataType))
                .GroupBy(element => element.DataType, StringComparer.Ordinal)
        )
        {
            // LockTaskData persisted these elements as locked earlier in this workflow. Staging
            // an unlock before removal makes the aggregate planner emit ignoreLock=true on each
            // delete without creating a separate unlock save.
            unitOfWork.UnlockDataElementsForDataType(elementsByDataType.Key);
            foreach (DataElement dataElement in elementsByDataType.ToList())
            {
                unitOfWork.RemoveDataElement(dataElement);
            }
        }

        if (applicationMetadata.AutoDeleteOnProcessEnd == true)
        {
            unitOfWork.HardDeleteInstance();
        }
    }
}
