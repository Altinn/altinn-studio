using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.OrgAlertPerson;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class OrgAlertPersonRepository(DesignerdbContext dbContext) : IOrgAlertPersonRepository
{
    public async Task<IReadOnlyList<OrgAlertPersonEntity>> GetAllAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var dbModels = await dbContext
            .OrgAlertPersons.AsNoTracking()
            .Where(p => p.Org == org)
            .ToListAsync(cancellationToken);
        return dbModels.Select(OrgAlertPersonMapper.MapToEntity).ToList();
    }

    public async Task<OrgAlertPersonEntity> AddAsync(
        OrgAlertPersonEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var dbModel = OrgAlertPersonMapper.MapToDbModel(entity);
        dbContext.OrgAlertPersons.Add(dbModel);
        await dbContext.SaveChangesAsync(cancellationToken);
        return OrgAlertPersonMapper.MapToEntity(dbModel);
    }

    public async Task<OrgAlertPersonEntity> UpdateAsync(
        OrgAlertPersonEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var existing = await dbContext.OrgAlertPersons.SingleAsync(
            p => p.Org == entity.Org && p.Id == entity.Id,
            cancellationToken
        );
        existing.Name = entity.Name;
        existing.Email = entity.Email;
        existing.EmailSeverity = entity.EmailSeverity;
        existing.Phone = entity.Phone;
        existing.SmsSeverity = entity.SmsSeverity;
        existing.IsActive = entity.IsActive;
        await dbContext.SaveChangesAsync(cancellationToken);
        return OrgAlertPersonMapper.MapToEntity(existing);
    }

    public async Task DeleteAsync(string org, Guid id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var existing = await dbContext.OrgAlertPersons.SingleAsync(p => p.Org == org && p.Id == id, cancellationToken);
        dbContext.OrgAlertPersons.Remove(existing);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
