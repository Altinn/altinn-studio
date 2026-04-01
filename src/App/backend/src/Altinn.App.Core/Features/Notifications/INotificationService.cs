using Altinn.App.Core.Models.Notifications.Future;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Notifications;

/// <summary>
/// Interface for handling notifications related to instances.
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Sends notifications to the instance owner related to the instantiation of the instance.
    /// </summary>
    /// <param name="instance">The instance being instantiated.</param>
    /// <param name="party">Instance owner party.</param>
    /// <param name="instantiationNotification">The notification details for the instantiation.</param>
    /// <param name="ct">Cancellation token for the operation.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task NotifyInstanceOwnerOnInstantiation(
        Instance instance,
        Party party,
        InstantiationNotification instantiationNotification,
        CancellationToken ct
    );
}
