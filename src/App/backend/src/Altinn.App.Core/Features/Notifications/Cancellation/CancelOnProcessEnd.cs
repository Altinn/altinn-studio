using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Notifications.Cancellation;

/// <summary>
/// Default implementation - send notification unless the process has already ended
/// </summary>
public class SendOnProcessNotEnded : ICancelInstantiationNotification
{
    /// <summary>
    /// Send if the process has not yet ended
    /// </summary>
    public bool ShouldSend(Instance instance)
    {
        bool processHasEnded = instance.Process.Ended is not null;
        return !processHasEnded;
    }
}
