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
    private readonly IProcessBaselineStore _processBaselineStore;
    private readonly ILogger<ProcessDataCleanupService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessDataCleanupService"/> class.
    /// </summary>
    public ProcessDataCleanupService(
        IDataService dataService,
        IApplicationService applicationService,
        IProcessBaselineStore processBaselineStore,
        ILogger<ProcessDataCleanupService> logger
    )
    {
        _dataService = dataService;
        _applicationService = applicationService;
        _processBaselineStore = processBaselineStore;
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

        // Note: This is a v8 compatibility layer. V9 apps perform their own cleanup.
        //
        // Timestamp guard: only delete elements that already existed before the in-flight transition
        // began. The baseline is when this service applied the instance's previous process change,
        // so both sides of the comparison come from this service's clock: genuinely stale elements
        // were created during a previous visit to the entering task, which necessarily ended at or
        // before the previous process change, while elements created by the transition itself (the
        // v9 engine runs task-start commands before this save) are necessarily younger than it.
        //
        // A missing baseline means either no process change has been recorded for this instance
        // (nothing stale can exist yet) or this service restarted since the last change - in that
        // case deleting on a guess risks data loss, so skip and let the next visit clean up.
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[^1]);
        DateTime? baseline = _processBaselineStore.GetLastProcessChange(instanceGuid);
        if (baseline is null)
        {
            _logger.LogInformation(
                "No process-change baseline recorded for instance {InstanceId}; skipping task cleanup for {TaskId}",
                instance.Id,
                taskId
            );
            return 0;
        }

        List<DataElement> tagged = instance
            .Data.Where(de =>
                de.References?.Any(r =>
                    r.Relation == RelationType.GeneratedFrom
                    && r.ValueType == ReferenceType.Task
                    && r.Value == taskId
                )
                    is true
            )
            .ToList();

        List<DataElement> stale = tagged
            .Where(de => de.Created is null || de.Created < baseline)
            .ToList();

        if (stale.Count < tagged.Count)
        {
            _logger.LogInformation(
                "Timestamp guard spared {Spared} data element(s) tagged with task {TaskId} on instance {InstanceId}: created after the transition baseline {Baseline:O}",
                tagged.Count - stale.Count,
                taskId,
                instance.Id,
                baseline
            );
        }

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
