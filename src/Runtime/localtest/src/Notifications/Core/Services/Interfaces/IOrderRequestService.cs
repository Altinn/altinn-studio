using Altinn.Notifications.Core.Models.Orders;

namespace Altinn.Notifications.Core.Services.Interfaces;

/// <summary>
/// Interface for the notification order service
/// </summary>
public interface IOrderRequestService
{
    /// <summary>
    /// Registers a new order
    /// </summary>
    /// <param name="orderRequest">The notification order request</param>
    /// <returns>The order request response object</returns>
    public Task<NotificationOrderRequestResponse> RegisterNotificationOrder(NotificationOrderRequest orderRequest);
}
