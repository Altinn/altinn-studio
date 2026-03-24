using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IContactPointsService
{
    Task<IReadOnlyList<ContactPoint>> GetContactPointsAsync(string org, CancellationToken cancellationToken = default);

    Task<ContactPoint> AddContactPointAsync(
        string org,
        ContactPoint contactPoint,
        CancellationToken cancellationToken = default
    );

    Task<ContactPoint> UpdateContactPointAsync(
        string org,
        Guid id,
        ContactPoint contactPoint,
        CancellationToken cancellationToken = default
    );

    Task DeleteContactPointAsync(string org, Guid id, CancellationToken cancellationToken = default);
}
