using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IDeploymentDispatchService
{
    Task TryDispatchAsync(
        string org,
        string workflowId,
        string? traceParent,
        string? traceState,
        CancellationToken cancellationToken
    );

    Task DispatchPendingAsync(CancellationToken cancellationToken);
}
