using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IRepositoryCleanupService
{
    Task<RepositoryCleanupResult> DeleteInactiveRepositoriesAsync(CancellationToken cancellationToken = default);
}
