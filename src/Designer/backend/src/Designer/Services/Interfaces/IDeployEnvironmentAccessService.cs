using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IDeployEnvironmentAccessService
{
    Task GrantAccessAsync(
        string org,
        string username,
        string environment,
        CancellationToken cancellationToken = default
    );
    Task RevokeAccessAsync(
        string org,
        string username,
        string environment,
        CancellationToken cancellationToken = default
    );
}
