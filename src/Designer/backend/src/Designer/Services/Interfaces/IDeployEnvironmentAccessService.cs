using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IDeployEnvironmentAccessService
{
    Task GrantAccessAsync(
        string org,
        string username,
        IEnumerable<string> environments,
        CancellationToken cancellationToken = default
    );
    Task RevokeAccessAsync(
        string org,
        string username,
        IEnumerable<string> environments,
        CancellationToken cancellationToken = default
    );
    Task<List<string>> GetDeployEnvironmentsAsync(
        string org,
        string username,
        CancellationToken cancellationToken = default
    );
}
