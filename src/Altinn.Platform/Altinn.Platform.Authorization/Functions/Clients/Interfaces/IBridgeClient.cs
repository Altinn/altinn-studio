using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Functions.Models;

namespace Altinn.Platform.Authorization.Functions.Clients.Interfaces;

/// <summary>
/// Interface for the bridge client
/// </summary>
public interface IBridgeClient
{
    /// <summary>
    /// Posts a list of delegation events to the Altinn Bridge API endpoint
    /// </summary>
    /// <param name="delegationEvents">A list of delegation events</param>
    /// <returns>A HTTP response message</returns>
    Task<HttpResponseMessage> PostDelegationEventsAsync(List<PlatformDelegationEvent> delegationEvents);
}
