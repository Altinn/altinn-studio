using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class AppSettingsRepository : IAppSettingsRepository
{
    private readonly DesignerdbContext _dbContext;

    public AppSettingsRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AppSettingsEntity?> GetAsync(
        AltinnRepoContext context,
        string? environment = null,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        var dbModel = await _dbContext
            .AppSettings.AsNoTracking()
            .SingleOrDefaultAsync(
                a => a.Org == context.Org && a.App == context.Repo && a.Environment == environment,
                cancellationToken
            );

        return dbModel is null ? null : AppSettingsMapper.MapToModel(dbModel);
    }

    public async Task<IReadOnlyList<AppSettingsEntity>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var dbModels = await _dbContext.AppSettings.AsNoTracking().ToListAsync(cancellationToken);
        return dbModels.Select(AppSettingsMapper.MapToModel).ToList();
    }

    public async Task<AppSettingsEntity> UpsertAsync(
        AppSettingsEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        AppSettingsDbModel? existing = await _dbContext.AppSettings.SingleOrDefaultAsync(
            a => a.Org == entity.Org && a.App == entity.App && a.Environment == entity.Environment,
            cancellationToken
        );

        if (existing is null)
        {
            var dbObject = AppSettingsMapper.MapToDbModel(entity);
            _dbContext.AppSettings.Add(dbObject);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return AppSettingsMapper.MapToModel(dbObject);
        }

        existing.UndeployOnInactivity = entity.UndeployOnInactivity;
        existing.LastModifiedBy = entity.LastModifiedBy;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return AppSettingsMapper.MapToModel(existing);
    }
}
