using System.Collections.Generic;
using System.Linq;
using Altinn.Platform.Authorization.Functions.Models;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;

namespace Altinn.Platform.Authorization.Functions.Services;

/// <inheritdoc />
public class EventMapperService : IEventMapperService
{
    /// <inheritdoc />
    public List<PlatformDelegationEvent> MapToPlatformEventList(DelegationChangeEventList delegationChangeEventList)
    {
        return delegationChangeEventList.DelegationChangeEvents.Select(delegationChangeEvent => new PlatformDelegationEvent()
            {
                EventType = delegationChangeEvent.EventType,
                PolicyChangeId = delegationChangeEvent.DelegationChange.DelegationChangeId,
                Created = delegationChangeEvent.DelegationChange.Created,
                AltinnAppId = delegationChangeEvent.DelegationChange.AltinnAppId,
                OfferedByPartyId = delegationChangeEvent.DelegationChange.OfferedByPartyId,
                CoveredByPartyId = delegationChangeEvent.DelegationChange.CoveredByPartyId ?? 0,
                CoveredByUserId = delegationChangeEvent.DelegationChange.CoveredByUserId ?? 0,
                PerformedByUserId = delegationChangeEvent.DelegationChange.PerformedByUserId
            })
            .ToList();
    }
}
