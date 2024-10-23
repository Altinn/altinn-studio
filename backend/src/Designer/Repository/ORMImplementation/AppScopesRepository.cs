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

        if (appScope is null)
        {
            return null;
        }

        return AppScopesMapper.MapToModel(appScope);
    }

    public async Task<AppScopesEntity> SaveAppScopesAsync(AppScopesEntity appScopesEntity,
        CancellationToken cancellationToken = default)
    {
        var dbObject = AppScopesMapper.MapToDbModel(appScopesEntity);
        var existing = await _dbContext.AppScopes.SingleOrDefaultAsync(a => a.Org == dbObject.Org && a.App == dbObject.App, cancellationToken);
        if (existing is null)
        {
            _dbContext.AppScopes.Add(dbObject);
        }
        else
        {
            _dbContext.Entry(existing).CurrentValues.SetValues(dbObject);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return AppScopesMapper.MapToModel(dbObject);
    }
}
