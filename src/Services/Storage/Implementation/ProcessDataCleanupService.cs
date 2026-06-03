using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.Services;

/// <inheritdoc cref="IProcessDataCleanupService"/>
public class ProcessDataCleanupService : IProcessDataCleanupService
{
    private readonly IDataService _dataService;
    private readonly IApplicationService _applicationService;
    private readonly ILogger<ProcessDataCleanupService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessDataCleanupService"/> class.
    /// </summary>
    public ProcessDataCleanupService(
        IDataService dataService,
        IApplicationService applicationService,
        ILogger<ProcessDataCleanupService> logger
    )
    {
        _dataService = dataService;
        _applicationService = applicationService;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<int> CleanupGeneratedFromTask(
        Instance instance,
        string taskId,
        CancellationToken cancellationToken
    )
    {
        if (instance.Data is null or { Count: 0 })
        {
            return 0;
        }

        List<DataElement> stale = instance
            .Data.Where(de =>
                de.References?.Any(r =>
                    r.Relation == RelationType.GeneratedFrom
                    && r.ValueType == ReferenceType.Task
                    && r.Value == taskId
                )
                    is true
            )
            .ToList();

        if (stale.Count == 0)
        {
            return 0;
        }

        _logger.LogInformation(
            "Found {Count} stale data element(s) to delete for task {TaskId} on instance {InstanceId}",
            stale.Count,
            taskId,
            instance.Id
        );

        int? storageAccountNumber = await GetStorageAccountNumber(instance);
        int deleted = 0;
        foreach (DataElement dataElement in stale)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                await _dataService.DeleteImmediately(instance, dataElement, storageAccountNumber);
                instance.Data.Remove(dataElement);
                deleted++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to delete stale data element {DataElementId} ({BlobStoragePath}) for task {TaskId} on instance {InstanceId}; continuing",
                    dataElement.Id,
                    dataElement.BlobStoragePath,
                    taskId,
                    instance.Id
                );
            }
        }

        _logger.LogInformation(
            "Deleted {Deleted}/{Total} stale data element(s) for task {TaskId} on instance {InstanceId}",
            deleted,
            stale.Count,
            taskId,
            instance.Id
        );

        return deleted;
    }

    private async Task<int?> GetStorageAccountNumber(Instance instance)
    {
        (Application? application, ServiceError? error) =
            await _applicationService.GetApplicationOrErrorAsync(instance.AppId);

        if (application is null)
        {
            throw new InvalidOperationException(
                $"Failed to retrieve application for {instance.AppId}: [{error?.ErrorCode}] {error?.ErrorMessage}"
            );
        }

        return application.StorageAccountNumber;
    }
}
