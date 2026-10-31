using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IGiteaAppCounter
{
    /// <summary>
    /// Counts the app repositories of each organization in Gitea, by the organization's lowercase name. The
    /// shared repositories, such as datamodels, don't count, and organizations without apps are left out.
    /// </summary>
    Task<IReadOnlyDictionary<string, int>> CountAppsByOrganization(CancellationToken cancellationToken);
}
