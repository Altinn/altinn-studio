using System.Threading.Tasks;
using Altinn.Platform.Authorization.Functions.Models;

namespace Altinn.Platform.Authorization.Functions.Services.Interfaces;

/// <summary>
/// The service uses to map internal events to platform events and push them to Bridge.
/// </summary>
public interface IEventPusherService
{
    /// <summary>
    /// Pushes the events to bridge. Throws if something fails, or if Bridge returns a non-successful response to ensure retry.
    /// </summary>
    /// <param name="delegationChangeEvents">The delegation change events.</param>
    Task PushEvents(DelegationChangeEventList delegationChangeEvents);
}
