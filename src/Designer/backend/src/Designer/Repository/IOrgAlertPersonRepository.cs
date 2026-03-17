using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.OrgAlertPerson;

namespace Altinn.Studio.Designer.Repository;

public interface IOrgAlertPersonRepository
{
    Task<IReadOnlyList<OrgAlertPersonEntity>> GetAllAsync(string org, CancellationToken cancellationToken = default);
    Task<OrgAlertPersonEntity> AddAsync(OrgAlertPersonEntity entity, CancellationToken cancellationToken = default);
    Task<OrgAlertPersonEntity> UpdateAsync(OrgAlertPersonEntity entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(string org, Guid id, CancellationToken cancellationToken = default);
}
