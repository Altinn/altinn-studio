using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Notifications.Cancellation;

/// <summary>
/// Interface for determining whether a scheduled instantiation notification should be sent
/// </summary>
public interface ICancelInstantiationNotification
{
    /// <summary>
    /// Contains the logic for whether the notification should be sent
    /// </summary>
    bool ShouldSend(Instance instance);
}
