using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ContactPointRepository(DesignerdbContext dbContext) : IContactPointsRepository
{
    public async Task<IReadOnlyList<ContactPointEntity>> GetAllAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var dbModels = await dbContext
            .ContactPoints.AsNoTracking()
            .Include(p => p.Methods)
            .Where(p => p.Org == org)
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);
        return dbModels.Select(ContactPointMapper.MapToEntity).ToList();
    }

    public async Task<ContactPointEntity> AddAsync(
        ContactPointEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var dbModel = ContactPointMapper.MapToDbModel(entity);
        dbContext.ContactPoints.Add(dbModel);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ContactPointMapper.MapToEntity(dbModel);
    }

    public async Task<ContactPointEntity> UpdateAsync(
        ContactPointEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var existing = await dbContext
            .ContactPoints.Include(p => p.Methods)
            .SingleAsync(p => p.Org == entity.Org && p.Id == entity.Id, cancellationToken);

        existing.Name = entity.Name;
        existing.IsActive = entity.IsActive;
        existing.Environments = entity.Environments;

        dbContext.ContactMethods.RemoveRange(existing.Methods);
        existing.Methods = entity
            .Methods.Select(m => new ContactMethodDbModel
            {
                ContactPointId = existing.Id,
                MethodType = m.MethodType,
                Value = m.Value,
            })
            .ToList();

        await dbContext.SaveChangesAsync(cancellationToken);
        return ContactPointMapper.MapToEntity(existing);
    }

    public async Task ToggleActiveAsync(
        string org,
        Guid id,
        bool isActive,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        await dbContext
            .ContactPoints.Where(p => p.Org == org && p.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, isActive), cancellationToken);
    }

    public async Task DeleteAsync(string org, Guid id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await dbContext.ContactPoints.Where(p => p.Org == org && p.Id == id).ExecuteDeleteAsync(cancellationToken);
    }
}
