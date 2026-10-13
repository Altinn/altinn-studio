using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

/// <summary>
/// Deletes the data elements whose data type sets <c>autoDeleteOnProcessEnd</c>, after the ended state is saved
/// and the process-ended hook has run. The hard delete of the instance belongs to
/// <see cref="ReleaseProcessingStatus"/>, which must stage it together with the release.
/// </summary>
internal sealed class DeleteDataOnProcessEnd(IAppMetadata appMetadata) : IWorkflowEngineCommand
{
    public static string Key => "DeleteDataOnProcessEnd";

    public string GetKey() => Key;

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        if (parameters.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Deleting data on process end requires callback state restored into an InstanceDataUnitOfWork.",
                    nameof(InvalidOperationException)
                )
            );
        }

        if (unitOfWork.Instance.Process?.Ended is null)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "Deleting data on process end requires an ended process state.",
                    nameof(InvalidOperationException)
                )
            );
        }

        try
        {
            HashSet<string> dataTypesToDelete = appMetadata
                .ApplicationMetadata.DataTypes.Where(dataType => dataType?.AppLogic?.AutoDeleteOnProcessEnd == true)
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

            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
        catch (Exception ex)
        {
            return Task.FromResult<ProcessEngineCommandResult>(FailedProcessEngineCommandResult.Retryable(ex));
        }
    }
}
