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

        // Timestamp guard: only delete elements that already existed before the in-flight transition
        // began. The baseline is the stored (pre-update) instance's current-task start - genuinely
        // stale elements were created during a previous visit to the entering task, which necessarily
        // ended at or before the moment the task now being left started. Elements younger than the
        // baseline were created by the transition itself (the v9 engine runs task-start commands
        // before this save) and must survive the save that completes their own transition.
        //
        // Clock note: DataElement.Created is stamped by this service, but the baseline originates in
        // the app (ProcessEngine stamps CurrentTask.Started and sends it in the process PUT), so this
        // is a cross-clock comparison. The direction that must be correct - sparing newborns - has a
        // margin of the old task's entire duration, so realistic skew cannot flip it. The other
        // direction (skew causing a stale element to be spared once) is self-healing: v9 apps remove
        // stale elements themselves at task entry, and task-end producers upsert by tag.
        //
        // A missing baseline means the process never entered a task, so no previous visit can exist
        // and there is nothing stale to clean.
        DateTime? baseline = instance.Process?.CurrentTask?.Started ?? instance.Process?.Started;
        if (baseline is null)
        {
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

        List<DataElement> stale = tagged.Where(de => de.Created is null || de.Created < baseline).ToList();

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
