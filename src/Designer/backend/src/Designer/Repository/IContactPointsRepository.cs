using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;

namespace Altinn.Studio.Designer.Repository;

public interface IContactPointsRepository
{
    Task<IReadOnlyList<ContactPointEntity>> GetAllAsync(string org, CancellationToken cancellationToken = default);
    Task<ContactPointEntity> AddAsync(ContactPointEntity entity, CancellationToken cancellationToken = default);
    Task<ContactPointEntity> UpdateAsync(ContactPointEntity entity, CancellationToken cancellationToken = default);
    Task ToggleActiveAsync(string org, Guid id, bool isActive, CancellationToken cancellationToken = default);
    Task DeleteAsync(string org, Guid id, CancellationToken cancellationToken = default);
}
