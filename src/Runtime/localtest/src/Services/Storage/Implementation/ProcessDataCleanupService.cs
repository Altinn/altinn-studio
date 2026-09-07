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
    private readonly ILogger<ProcessDataCleanupService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessDataCleanupService"/> class.
    /// </summary>
    public ProcessDataCleanupService(
        ILogger<ProcessDataCleanupService> logger
    )
    {
        _logger = logger;
    }

    /// <inheritdoc/>
    public Task<IReadOnlyList<DataElement>> GetGeneratedFromTaskDataElements(
        Instance instance,
        string taskId,
        CancellationToken cancellationToken
    )
    {
        if (instance.Data is null or { Count: 0 })
        {
            return Task.FromResult<IReadOnlyList<DataElement>>([]);
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
            return Task.FromResult<IReadOnlyList<DataElement>>([]);
        }

        _logger.LogInformation(
            "Found {Count} stale data element(s) to delete for task {TaskId} on instance {InstanceId}",
            stale.Count,
            taskId,
            instance.Id
        );

        return Task.FromResult<IReadOnlyList<DataElement>>(stale);
    }
}
