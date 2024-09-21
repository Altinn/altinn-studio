using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class AppScopesRepository : IAppScopesRepository
{
    private readonly DesignerdbContext _dbContext;

    public AppScopesRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AppScopesEntity> GetAppScopesAsync(AltinnRepoContext repoContext, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var appScope = await _dbContext.AppScopes.AsNoTracking().SingleOrDefaultAsync(a => a.Org == repoContext.Org && a.App == repoContext.Repo, cancellationToken);

        return AppScopesMapper.MapToModel(appScope);
    }

    public Task<AppScopesEntity> SaveAppScopesAsync(AppScopesEntity appScopesEntity, CancellationToken cancellationToken = default) => throw new System.NotImplementedException();
}
