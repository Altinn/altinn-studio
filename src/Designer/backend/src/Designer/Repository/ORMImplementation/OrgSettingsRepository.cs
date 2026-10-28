using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.OrgSettings;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class OrgSettingsRepository : IOrgSettingsRepository
{
    private readonly DesignerdbContext _dbContext;

    public OrgSettingsRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<OrgSettingsEntity?> GetAsync(string org, CancellationToken cancellationToken = default)
    {
        var dbModel = await _dbContext
            .OrgSettings.AsNoTracking()
            .SingleOrDefaultAsync(o => o.Org == org, cancellationToken);

        return dbModel is null ? null : OrgSettingsMapper.MapToModel(dbModel);
    }

    public async Task<OrgSettingsEntity> UpsertAsync(
        OrgSettingsEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        var existing = await _dbContext.OrgSettings.SingleOrDefaultAsync(o => o.Org == entity.Org, cancellationToken);

        if (existing is null)
        {
            var dbObject = OrgSettingsMapper.MapToDbModel(entity);
            _dbContext.OrgSettings.Add(dbObject);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return OrgSettingsMapper.MapToModel(dbObject);
        }

        existing.UndeployOnInactivity = entity.UndeployOnInactivity;
        existing.InactivityPeriodDays = entity.InactivityPeriodDays;
        existing.LastModifiedBy = entity.LastModifiedBy;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return OrgSettingsMapper.MapToModel(existing);
    }
}
