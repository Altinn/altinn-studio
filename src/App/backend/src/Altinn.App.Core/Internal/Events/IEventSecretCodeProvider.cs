using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Events;

/// <summary>
/// Interface for providing a secret code to be used when
/// validating events from the Event system. This code is passed with
/// the subscription to the Event system and returned back when posting
/// the event to the app. If the code is the same the event is accepted.
/// </summary>
[ImplementableByApps]
public interface IEventSecretCodeProvider
{
    /// <summary>
    /// Gets a secret code that can be passed on to the event system
    /// when subscribing.
    /// </summary>
    public Task<string> GetSecretCode();
}
