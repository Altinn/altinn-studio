using System.Collections.Generic;
using Altinn.Platform.Authorization.Functions.Models;

namespace Altinn.Platform.Authorization.Functions.Services.Interfaces;

/// <summary>
/// Service mapping internal events to platform events
/// </summary>
public interface IEventMapperService
{
    /// <summary>
    /// Maps to platform event list.
    /// </summary>
    /// <param name="delegationChangeEventList">The delegation change event list.</param>
    /// <returns></returns>
    public List<PlatformDelegationEvent> MapToPlatformEventList(DelegationChangeEventList delegationChangeEventList);
}
