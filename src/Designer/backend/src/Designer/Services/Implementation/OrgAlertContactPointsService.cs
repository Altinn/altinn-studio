using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.OrgAlertPerson;
using Altinn.Studio.Designer.Repository.Models.OrgAlertSlackChannel;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class OrgAlertContactPointsService(
    IOrgAlertPersonRepository personRepository,
    IOrgAlertSlackChannelRepository slackChannelRepository,
    TimeProvider timeProvider
) : IOrgAlertContactPointsService
{
    public Task<IReadOnlyList<OrgAlertPersonEntity>> GetPersonsAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        return personRepository.GetAllAsync(org, cancellationToken);
    }

    public Task<OrgAlertPersonEntity> AddPersonAsync(
        string org,
        OrgAlertPersonEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        entity.Org = org;
        entity.CreatedAt = timeProvider.GetUtcNow();
        return personRepository.AddAsync(entity, cancellationToken);
    }

    public Task<OrgAlertPersonEntity> UpdatePersonAsync(
        string org,
        Guid id,
        OrgAlertPersonEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        entity.Org = org;
        entity.Id = id;
        return personRepository.UpdateAsync(entity, cancellationToken);
    }

    public Task DeletePersonAsync(string org, Guid id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return personRepository.DeleteAsync(org, id, cancellationToken);
    }

    public Task<IReadOnlyList<OrgAlertSlackChannelEntity>> GetSlackChannelsAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        return slackChannelRepository.GetAllAsync(org, cancellationToken);
    }

    public Task<OrgAlertSlackChannelEntity> AddSlackChannelAsync(
        string org,
        OrgAlertSlackChannelEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        entity.Org = org;
        entity.CreatedAt = timeProvider.GetUtcNow();
        return slackChannelRepository.AddAsync(entity, cancellationToken);
    }

    public Task<OrgAlertSlackChannelEntity> UpdateSlackChannelAsync(
        string org,
        Guid id,
        OrgAlertSlackChannelEntity entity,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        entity.Org = org;
        entity.Id = id;
        return slackChannelRepository.UpdateAsync(entity, cancellationToken);
    }

    public Task DeleteSlackChannelAsync(string org, Guid id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return slackChannelRepository.DeleteAsync(org, id, cancellationToken);
    }
}
