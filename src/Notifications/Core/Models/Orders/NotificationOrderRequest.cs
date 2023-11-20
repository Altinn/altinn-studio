#nullable enable
using Altinn.Notifications.Core.Enums;
using Altinn.Notifications.Core.Models.NotificationTemplate;

namespace Altinn.Notifications.Core.Models.Orders;

/// <summary>
/// Class representing a notification order request
/// </summary>
public class NotificationOrderRequest
{
    /// <summary>
    /// Gets the senders reference of a notification
    /// </summary>
    public string? SendersReference { get; internal set; }

    /// <summary>
    /// Gets the templates to create notifications based of
    /// </summary>
    public List<INotificationTemplate> Templates { get; internal set; }

    /// <summary>
    /// Gets the requested send time for the notification(s)
    /// </summary>
    public DateTime RequestedSendTime { get; internal set; }

    /// <summary>
    /// Gets the preferred notification channel
    /// </summary>
    public NotificationChannel NotificationChannel { get; internal set; }

    /// <summary>
    /// Gets a list of recipients
    /// </summary>
    public List<Recipient> Recipients { get; internal set; }

    /// <summary>
    /// Gets the creator of the notification request
    /// </summary>
    public Creator Creator { get; internal set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationOrderRequest"/> class.
    /// </summary>
    public NotificationOrderRequest(string? sendersReference, string creatorShortName, List<INotificationTemplate> templates, DateTime requestedSendTime, NotificationChannel notificationChannel, List<Recipient> recipients)
    {
        SendersReference = sendersReference;
        Creator = new(creatorShortName);
        Templates = templates;
        RequestedSendTime = requestedSendTime;
        NotificationChannel = notificationChannel;
        Recipients = recipients;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationOrderRequest"/> class.
    /// </summary>
    internal NotificationOrderRequest()
    {
        Creator = new Creator(string.Empty);
        Templates = new List<INotificationTemplate>();
        Recipients = new List<Recipient>();
    }
}
