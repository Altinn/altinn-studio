using Altinn.App.Core.Models.Notifications.Future;

namespace Altinn.App.Core.Features;

/// <summary>
/// Client for managing notification orders in the Altinn notification system.
/// </summary>
public interface INotificationOrderClient
{
    /// <summary>
    /// Orders a notification based on the provided request.
    /// </summary>
    /// <param name="request">The <see cref="NotificationOrderRequest"/>. </param>
    /// <param name="ct">Cancellation token for the operation.</param>
    /// <returns></returns>
    Task<NotificationOrderResponse> Order(NotificationOrderRequest request, CancellationToken ct);
}
