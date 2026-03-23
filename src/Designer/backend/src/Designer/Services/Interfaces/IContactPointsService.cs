using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IContactPointsService
{
    Task<IReadOnlyList<ContactPointEntity>> GetContactPointsAsync(
        string org,
        CancellationToken cancellationToken = default
    );

    Task<ContactPointEntity> AddContactPointAsync(
        string org,
        ContactPointEntity entity,
        CancellationToken cancellationToken = default
    );

    Task<ContactPointEntity> UpdateContactPointAsync(
        string org,
        Guid id,
        ContactPointEntity entity,
        CancellationToken cancellationToken = default
    );

    Task DeleteContactPointAsync(string org, Guid id, CancellationToken cancellationToken = default);
}
