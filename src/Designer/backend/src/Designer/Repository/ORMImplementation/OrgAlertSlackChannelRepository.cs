using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.OrgAlertSlackChannel;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class OrgAlertSlackChannelRepository(DesignerdbContext dbContext) : IOrgAlertSlackChannelRepository
{
    public async Task<IReadOnlyList<OrgAlertSlackChannelEntity>> GetAllAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var dbModels = await dbContext
            .OrgAlertSlackChannels.AsNoTracking()
            .Where(c => c.Org == org)
            .ToListAsync(cancellationToken);
        return dbModels.Select(OrgAlertSlackChannelMapper.MapToEntity).ToList();
    }

    public async Task<OrgAlertSlackChannelEntity> AddAsync(
        OrgAlertSlackChannelEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var dbModel = OrgAlertSlackChannelMapper.MapToDbModel(entity);
        dbContext.OrgAlertSlackChannels.Add(dbModel);
        await dbContext.SaveChangesAsync(cancellationToken);
        return OrgAlertSlackChannelMapper.MapToEntity(dbModel);
    }

    public async Task<OrgAlertSlackChannelEntity> UpdateAsync(
        OrgAlertSlackChannelEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var existing = await dbContext.OrgAlertSlackChannels.SingleAsync(
            c => c.Org == entity.Org && c.Id == entity.Id,
            cancellationToken
        );
        existing.ChannelName = entity.ChannelName;
        existing.SlackId = entity.SlackId;
        existing.Severity = entity.Severity;
        existing.IsActive = entity.IsActive;
        await dbContext.SaveChangesAsync(cancellationToken);
        return OrgAlertSlackChannelMapper.MapToEntity(existing);
    }

    public async Task DeleteAsync(string org, Guid id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var existing = await dbContext.OrgAlertSlackChannels.SingleAsync(
            c => c.Org == org && c.Id == id,
            cancellationToken
        );
        dbContext.OrgAlertSlackChannels.Remove(existing);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
