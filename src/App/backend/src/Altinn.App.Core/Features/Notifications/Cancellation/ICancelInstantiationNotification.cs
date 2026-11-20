using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Notifications.Cancellation;

/// <summary>
/// Interface for determining whether a scheduled instantiation notification should be sent
/// </summary>
/// <remarks>
/// It is only asked about instances that exist and are not deleted. The default implementation sends the
/// notification until the process has ended, which is not necessarily when the form is submitted.
/// </remarks>
public interface ICancelInstantiationNotification
{
    /// <summary>
    /// Contains the logic for whether the notification should be sent
    /// </summary>
    bool ShouldSend(Instance instance);
}
