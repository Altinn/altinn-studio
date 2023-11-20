#nullable enable
namespace Altinn.Notifications.Core.Models.Notification;

/// <summary>
/// Interface representing a notification object with send result data
/// </summary>
/// <typeparam name="TClass">The class representing the recipient</typeparam>
/// <typeparam name="TEnum">The enum used to describe the send result</typeparam>
public interface INotificationWithResult<TClass, TEnum>
    where TClass : class
    where TEnum : struct, Enum
{
    /// <summary>
    /// Gets the notification id
    /// </summary>   
    public Guid Id { get; }

    /// <summary>
    /// Gets a boolean indicating if the sending was successful
    /// </summary>   
    public bool Succeeded { get; }

    /// <summary>
    /// Sets the recipient with contact points
    /// </summary>
    public TClass Recipient { get; }

    /// <summary>
    /// Gets the send result
    /// </summary>   
    public NotificationResult<TEnum> ResultStatus { get; }
}
