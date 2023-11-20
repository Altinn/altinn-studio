#nullable enable
namespace Altinn.Notifications.Core.Models.Notification;

/// <summary>
/// An interface representing a summary of the notifications related to an order
/// </summary>
public interface INotificationSummary<TClass>
    where TClass : class
{
    /// <summary>
    /// Gets the notification order id
    /// </summary>   
    public Guid OrderId { get; }

    /// <summary>
    /// Gets the senders reference of the notification order
    /// </summary>    
    public string? SendersReference { get; }

    /// <summary>
    /// Gets the number of generated notifications
    /// </summary>    
    public int Generated { get; }

    /// <summary>
    /// Gets the number of succeeeded notifications
    /// </summary>
    public int Succeeded { get; }

    /// <summary>
    /// Gets the list of notifications with send result
    /// </summary>
    public List<TClass> Notifications { get; }
}
