using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppActivity;

namespace Altinn.Studio.Designer.Repository;

public interface IAppActivityRepository
{
    Task<DateTimeOffset?> GetLatestCollectedAtAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    );

    Task<bool> HasDeployedAppsAsync(string org, string environment, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AppActivityRecord>> GetForEnvironmentAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    );

    Task UpsertBatchAsync(AppActivityCollectionBatch batch, CancellationToken cancellationToken = default);
}
