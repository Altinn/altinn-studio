using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;

namespace Altinn.Studio.Designer.Repository;

public interface IAppScopesRepository
{
    Task<AppScopesEntity> GetAppScopesAsync(AltinnRepoContext repoContext, CancellationToken cancellationToken = default);
    Task<AppScopesEntity> UpsertAppScopesAsync(AppScopesEntity appScopesEntity, CancellationToken cancellationToken = default);
}
