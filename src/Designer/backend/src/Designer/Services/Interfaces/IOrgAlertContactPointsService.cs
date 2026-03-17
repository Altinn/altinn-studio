using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.OrgAlertPerson;
using Altinn.Studio.Designer.Repository.Models.OrgAlertSlackChannel;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IOrgAlertContactPointsService
{
    Task<IReadOnlyList<OrgAlertPersonEntity>> GetPersonsAsync(
        string org,
        CancellationToken cancellationToken = default
    );
    Task<OrgAlertPersonEntity> AddPersonAsync(
        string org,
        OrgAlertPersonEntity entity,
        CancellationToken cancellationToken = default
    );
    Task<OrgAlertPersonEntity> UpdatePersonAsync(
        string org,
        Guid id,
        OrgAlertPersonEntity entity,
        CancellationToken cancellationToken = default
    );
    Task DeletePersonAsync(string org, Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OrgAlertSlackChannelEntity>> GetSlackChannelsAsync(
        string org,
        CancellationToken cancellationToken = default
    );
    Task<OrgAlertSlackChannelEntity> AddSlackChannelAsync(
        string org,
        OrgAlertSlackChannelEntity entity,
        CancellationToken cancellationToken = default
    );
    Task<OrgAlertSlackChannelEntity> UpdateSlackChannelAsync(
        string org,
        Guid id,
        OrgAlertSlackChannelEntity entity,
        CancellationToken cancellationToken = default
    );
    Task DeleteSlackChannelAsync(string org, Guid id, CancellationToken cancellationToken = default);
}
