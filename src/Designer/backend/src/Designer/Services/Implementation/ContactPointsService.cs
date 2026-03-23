using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ContactPointsService(IContactPointRepository repository, TimeProvider timeProvider) : IContactPointsService
{
    public Task<IReadOnlyList<ContactPointEntity>> GetContactPointsAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        return repository.GetAllAsync(org, cancellationToken);
    }

    public Task<ContactPointEntity> AddContactPointAsync(
        string org,
        ContactPointEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        entity.Org = org;
        entity.CreatedAt = timeProvider.GetUtcNow();
        return repository.AddAsync(entity, cancellationToken);
    }

    public Task<ContactPointEntity> UpdateContactPointAsync(
        string org,
        Guid id,
        ContactPointEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        entity.Org = org;
        entity.Id = id;
        return repository.UpdateAsync(entity, cancellationToken);
    }

    public Task DeleteContactPointAsync(string org, Guid id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return repository.DeleteAsync(org, id, cancellationToken);
    }
}
