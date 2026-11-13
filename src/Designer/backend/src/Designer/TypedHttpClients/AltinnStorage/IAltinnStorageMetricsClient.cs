using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;

/// <summary>
/// Reads the per-app instance metrics that Storage computes for Altinn Studio.
/// </summary>
public interface IAltinnStorageMetricsClient
{
    /// <summary>
    /// Gets the metrics for every app of a service owner in one environment for one UTC day.
    /// </summary>
    Task<StudioDailyMetrics> GetDailyMetrics(string org, string env, DateOnly date, CancellationToken ct);
}
