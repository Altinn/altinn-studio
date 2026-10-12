using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

/// <summary>
/// The last step of every process-end workflow: stages the configured process-end cleanup and
/// <c>processing</c> → <c>idle</c> in one save, after <see cref="CommitProcessState"/> saved the ended state.
/// </summary>
internal sealed class ReleaseEndedInstance(IAppMetadata appMetadata) : IWorkflowEngineCommand
{
    public static string Key => "ReleaseEndedInstance";

    public string GetKey() => Key;

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        if (parameters.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Releasing the instance requires callback state restored into an InstanceDataUnitOfWork.",
                    nameof(InvalidOperationException)
                )
            );
        }

        Instance instance = unitOfWork.Instance;
        if (instance.Process?.Ended is null)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Releasing an ended instance requires an ended process state.",
                    nameof(InvalidOperationException)
                )
            );
        }

        try
        {
            StageProcessEndCleanup(unitOfWork, appMetadata.ApplicationMetadata);
            unitOfWork.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);
            instance.Process.Status = ProcessStatus.Idle;
            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
        catch (Exception ex)
        {
            return Task.FromResult<ProcessEngineCommandResult>(FailedProcessEngineCommandResult.Retryable(ex));
        }
    }

    private static void StageProcessEndCleanup(
        InstanceDataUnitOfWork unitOfWork,
        ApplicationMetadata applicationMetadata
    )
    {
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
