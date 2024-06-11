using Altinn.Notifications.Core.Enums;
using Altinn.Notifications.Core.Models.Orders;

namespace Altinn.Notifications.Core.Persistence;

/// <summary>
/// Interface describing all repository actions for notification orders
/// </summary>
public interface IOrderRepository
{
    /// <summary>
    /// Creates a new notification order in the database
    /// </summary>
    /// <param name="order">The order to save</param>
    /// <returns>The saved notification order</returns>
    public Task<NotificationOrder> Create(NotificationOrder order);

    /// <summary>
    /// Gets a list of notification orders where requestedSendTime has passed
    /// </summary>
    /// <returns>A list of notification orders</returns>
    public Task<List<NotificationOrder>> GetPastDueOrdersAndSetProcessingState();

    /// <summary>
    /// Sets processing status of an order
    /// </summary>
    public Task SetProcessingStatus(Guid orderId, OrderProcessingStatus status);

    /// <summary>
    /// Gets an order based on the provided id within the provided creator scope
    /// </summary>
    /// <param name="id">The order id</param>
    /// <param name="creator">The short name of the order creator</param>
    /// <returns>A notification order if it exists</returns>
    public Task<NotificationOrder?> GetOrderById(Guid id, string creator);

    /// <summary>
    /// Gets an order with process and notification status based on the provided id within the provided creator scope
    /// </summary>
    /// <param name="id">The order id</param>
    /// <param name="creator">The short name of the order creator</param>
    /// <returns>A notification order if it exists</returns>
    public Task<NotificationOrderWithStatus?> GetOrderWithStatusById(Guid id, string creator);

    /// <summary>
    /// Gets an order based on the provided senders reference within the provided creator scope
    /// </summary>
    /// <param name="sendersReference">The senders reference</param>
    /// <param name="creator">The short name of the order creator</param>
    /// <returns>A list of notification orders</returns>
    public Task<List<NotificationOrder>> GetOrdersBySendersReference(string sendersReference, string creator);
}
