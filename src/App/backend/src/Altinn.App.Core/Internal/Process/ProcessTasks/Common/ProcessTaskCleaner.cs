using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

internal sealed class ProcessTaskCleaner : IProcessTaskCleaner
{
    private readonly ILogger<ProcessTaskCleaner> _logger;
    private readonly IDataClient _dataClient;

    public ProcessTaskCleaner(ILogger<ProcessTaskCleaner> logger, IDataClient dataClient)
    {
        _logger = logger;
        _dataClient = dataClient;
    }

    /// <inheritdoc/>
    public async Task RemoveAllDataElementsGeneratedFromTask(Instance instance, string taskId)
    {
        InstanceIdentifier instanceIdentifier = new(instance);
        var dataElements =
            instance
                .Data?.Where(de =>
                    de.References?.Exists(r => r.ValueType == ReferenceType.Task && r.Value == taskId) is true
                )
                .ToList()
            ?? [];

        _logger.LogInformation("Found {Count} stale data element(s) to delete", dataElements.Count);

        foreach (var dataElement in dataElements)
        {
            _logger.LogWarning(
                "Deleting stale data element for task {TaskId}: {BlobStoragePath}",
                taskId,
                dataElement.BlobStoragePath
            );
            await _dataClient.DeleteData(
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                Guid.Parse(dataElement.Id),
                false
            );

            instance.Data?.Remove(dataElement);
        }
    }
}
