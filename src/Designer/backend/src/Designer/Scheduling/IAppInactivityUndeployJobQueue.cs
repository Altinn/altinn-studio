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
}
