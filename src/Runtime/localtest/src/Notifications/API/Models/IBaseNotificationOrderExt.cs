#nullable enable
namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing the base properties of a registered notification order. 
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public interface IBaseNotificationOrderExt
{
    /// <summary>
    /// Gets or sets the id of the notification order
    /// </summary>
    public string Id { get; set; }

    /// <summary>
    /// Gets or sets the short name of the creator of the notification order
    /// </summary>
    public string Creator { get; set; }

    /// <summary>
    /// Gets or sets the senders reference of the notification
    /// </summary>
    public string? SendersReference { get; set; }

    /// <summary>
    /// Gets or sets the requested send time of the notification
    /// </summary>
    public DateTime RequestedSendTime { get; set; }

    /// <summary>
    /// Gets or sets the date and time of when the notification order was created
    /// </summary>
    public DateTime Created { get; set; }

    /// <summary>
    /// Gets or sets the preferred notification channel of the notification order
    /// </summary>
    public NotificationChannelExt NotificationChannel { get; set; }
}
