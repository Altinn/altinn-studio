using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.OrgAlertSlackChannel;

namespace Altinn.Studio.Designer.Repository;

public interface IOrgAlertSlackChannelRepository
{
    Task<IReadOnlyList<OrgAlertSlackChannelEntity>> GetAllAsync(
        string org,
        CancellationToken cancellationToken = default
    );
    Task<OrgAlertSlackChannelEntity> AddAsync(
        OrgAlertSlackChannelEntity entity,
        CancellationToken cancellationToken = default
    );
    Task<OrgAlertSlackChannelEntity> UpdateAsync(
        OrgAlertSlackChannelEntity entity,
        CancellationToken cancellationToken = default
    );
    Task DeleteAsync(string org, Guid id, CancellationToken cancellationToken = default);
}
