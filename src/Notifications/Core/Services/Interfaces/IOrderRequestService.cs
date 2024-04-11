#nullable enable
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
    /// <returns>The registered notification order</returns>
    public Task<NotificationOrder> RegisterNotificationOrder(NotificationOrderRequest orderRequest);
}
