using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
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

        return appScope is null ? null : AppScopesMapper.MapToModel(appScope);
    }

    public async Task<AppScopesEntity> UpsertAppScopesAsync(AppScopesEntity appScopesEntity,
        CancellationToken cancellationToken = default)
    {
        AppScopesDbModel existing = await _dbContext.AppScopes.AsNoTracking().SingleOrDefaultAsync(a => a.Org == appScopesEntity.Org && a.App == appScopesEntity.App, cancellationToken);

        var dbObject = existing is null
            ? AppScopesMapper.MapToDbModel(appScopesEntity)
            : AppScopesMapper.MapToDbModel(appScopesEntity, existing.Id);

        if (existing is null)
        {
            _dbContext.AppScopes.Add(dbObject);
        }
        else
        {
            _dbContext.Entry(dbObject).State = EntityState.Modified;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return AppScopesMapper.MapToModel(dbObject);
    }
}
