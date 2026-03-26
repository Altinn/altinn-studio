using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IContactPointsService
{
    Task<IReadOnlyList<ContactPoint>> GetContactPointsAsync(string org, CancellationToken cancellationToken = default);

    Task<ContactPoint> AddContactPointAsync(ContactPoint contactPoint, CancellationToken cancellationToken = default);

    Task<ContactPoint> UpdateContactPointAsync(
        ContactPoint contactPoint,
        CancellationToken cancellationToken = default
    );

    Task ToggleContactPointActiveAsync(
        string org,
        Guid id,
        bool isActive,
        CancellationToken cancellationToken = default
    );

    Task DeleteContactPointAsync(string org, Guid id, CancellationToken cancellationToken = default);
}
