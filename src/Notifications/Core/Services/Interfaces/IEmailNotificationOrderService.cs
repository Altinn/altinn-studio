#nullable enable
using Altinn.Notifications.Core.Models;
using Altinn.Notifications.Core.Models.Orders;

namespace Altinn.Notifications.Core.Services.Interfaces;

/// <summary>
/// Interface for the email notification order service
/// </summary>
public interface IEmailNotificationOrderService
{
    /// <summary>
    /// Registers a new order
    /// </summary>
    /// <param name="orderRequest">The email notification order request</param>
    /// <returns>The registered notification order</returns>
    public Task<(NotificationOrder? Order, ServiceError? Error)> RegisterEmailNotificationOrder(NotificationOrderRequest orderRequest);
}
