using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
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

    public Task<WorkflowEngineCommandResult> Execute(WorkflowEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        if (dataMutator.Instance.Process?.Ended is null)
        {
            return Task.FromResult<WorkflowEngineCommandResult>(
                FailedWorkflowEngineCommandResult.Permanent(
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
                DataElement dataElement in dataMutator
                    .Instance.Data.Where(element => dataTypesToDelete.Contains(element.DataType))
                    .ToList()
            )
            {
                dataMutator.RemoveDataElement(dataElement);
            }

            return Task.FromResult<WorkflowEngineCommandResult>(new SuccessfulWorkflowEngineCommandResult());
        }
        catch (Exception ex)
        {
            return Task.FromResult<WorkflowEngineCommandResult>(FailedWorkflowEngineCommandResult.Retryable(ex));
        }
    }
}
