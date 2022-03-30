using System.Collections.Generic;
using System.Linq;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Models.DelegationChangeEvent;
using Altinn.Platform.Authorization.Services.Interface;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <inheritdoc />
    public class EventMapperService : IEventMapperService
    {
        /// <inheritdoc/>
        public DelegationChangeEventList MapToDelegationChangeEventList(List<DelegationChange> delegationChanges)
        {
            return new DelegationChangeEventList
            {
                DelegationChangeEvents = delegationChanges.Select(delegationChange => new DelegationChangeEvent
                {
                    EventType = (DelegationChangeEventType)delegationChange.DelegationChangeType,
                    DelegationChange = new SimpleDelegationChange
                    {
                        DelegationChangeId = delegationChange.DelegationChangeId,
                        AltinnAppId = delegationChange.AltinnAppId,
                        OfferedByPartyId = delegationChange.OfferedByPartyId,
                        CoveredByPartyId = delegationChange.CoveredByPartyId,
                        CoveredByUserId = delegationChange.CoveredByUserId,
                        PerformedByUserId = delegationChange.PerformedByUserId,
                        Created = delegationChange.Created
                    }
                }).ToList()
            };
        }
    }
}
