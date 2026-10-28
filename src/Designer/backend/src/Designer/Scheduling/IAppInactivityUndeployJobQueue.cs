using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Scheduling;

public interface IAppInactivityUndeployJobQueue
{
    Task<bool> QueuePerOrgEvaluationJobAsync(
        string org,
        string? environmentFilter,
        CancellationToken cancellationToken = default
    );

    Task<bool> QueuePerAppUndeployJobAsync(
        string org,
        string app,
        string environment,
        int index,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Counts the per-app undeploy jobs that are queued and haven't finished, across all orgs.
    /// </summary>
    Task<int> CountPendingPerAppUndeployJobsAsync(CancellationToken cancellationToken = default);
}
