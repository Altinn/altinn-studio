using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ContactPointsService(IContactPointsRepository repository) : IContactPointsService
{
    public async Task<IReadOnlyList<ContactPoint>> GetContactPointsAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        var entities = await repository.GetAllAsync(org, cancellationToken);
        return entities.Select(MapToDomain).ToList();
    }

    public async Task<ContactPoint> AddContactPointAsync(
        ContactPoint contactPoint,
        CancellationToken cancellationToken = default
    )
    {
        var entity = MapToEntity(contactPoint);
        var created = await repository.AddAsync(entity, cancellationToken);
        return MapToDomain(created);
    }

    public async Task<ContactPoint> UpdateContactPointAsync(
        ContactPoint contactPoint,
        CancellationToken cancellationToken = default
    )
    {
        var entity = MapToEntity(contactPoint);
        var updated = await repository.UpdateAsync(entity, cancellationToken);
        return MapToDomain(updated);
    }

    public Task ToggleContactPointActiveAsync(
        string org,
        Guid id,
        bool isActive,
        CancellationToken cancellationToken = default
    ) => repository.ToggleActiveAsync(org, id, isActive, cancellationToken);

    public Task DeleteContactPointAsync(string org, Guid id, CancellationToken cancellationToken = default) =>
        repository.DeleteAsync(org, id, cancellationToken);

    private static ContactPoint MapToDomain(ContactPointEntity entity) =>
        new()
        {
            Id = entity.Id,
            Org = entity.Org,
            Name = entity.Name,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt,
            Environments = entity.Environments,
            Methods = entity
                .Methods.Select(m => new ContactMethod
                {
                    Id = m.Id,
                    MethodType = m.MethodType,
                    Value = m.Value,
                })
                .ToList(),
        };

    private static ContactPointEntity MapToEntity(ContactPoint contactPoint) =>
        new()
        {
            Id = contactPoint.Id,
            Org = contactPoint.Org,
            Name = contactPoint.Name,
            IsActive = contactPoint.IsActive,
            Environments = contactPoint.Environments,
            Methods = contactPoint
                .Methods.Select(m => new ContactMethodEntity
                {
                    Id = m.Id,
                    MethodType = m.MethodType,
                    Value = m.Value,
                })
                .ToList(),
        };
}
