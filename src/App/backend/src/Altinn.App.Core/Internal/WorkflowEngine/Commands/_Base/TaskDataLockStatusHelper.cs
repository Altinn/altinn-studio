using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

internal static class TaskDataLockStatusHelper
{
    public static async Task SetLockStatus(
        IAppMetadata appMetadata,
        IInstanceDataMutator instanceDataMutator,
        string taskId,
        bool locked
    )
    {
        ApplicationMetadata applicationMetadata = await appMetadata.GetApplicationMetadata();
        HashSet<string> connectedDataTypeIds = applicationMetadata
            .DataTypes.Where(dataType => dataType.TaskId == taskId)
            .Select(dataType => dataType.Id)
            .ToHashSet(StringComparer.Ordinal);

        if (connectedDataTypeIds.Count == 0)
        {
            return;
        }

        if (instanceDataMutator is not InstanceDataUnitOfWork instanceDataUnitOfWork)
        {
            throw new UnreachableException(
                $"{nameof(TaskDataLockStatusHelper)} requires {nameof(InstanceDataUnitOfWork)}."
            );
        }

        foreach (string dataTypeId in connectedDataTypeIds)
        {
            if (locked)
            {
                instanceDataUnitOfWork.LockDataElementsForDataType(dataTypeId);
            }
            else
            {
                instanceDataUnitOfWork.UnlockDataElementsForDataType(dataTypeId);
            }
        }
    }
}
