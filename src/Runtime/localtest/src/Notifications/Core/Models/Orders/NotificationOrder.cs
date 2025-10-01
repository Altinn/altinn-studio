using System.Text.Json;

using Altinn.Notifications.Core.Enums;
using Altinn.Notifications.Core.Models.NotificationTemplate;

namespace Altinn.Notifications.Core.Models.Orders;

/// <summary>
/// Class representing a notification order
/// </summary>
public class NotificationOrder : IBaseNotificationOrder
{
    /// <inheritdoc/>>
    public Guid Id { get; internal set; } = Guid.Empty;

    /// <inheritdoc/>>
    public string? SendersReference { get; internal set; }

    /// <inheritdoc/>>
    public DateTime RequestedSendTime { get; internal set; }

    /// <inheritdoc/>>
    public NotificationChannel NotificationChannel { get; internal set; }

    /// <inheritdoc/>>    
    public bool? IgnoreReservation { get; internal set; }

    /// <inheritdoc/>>
    public string? ResourceId { get; internal set; }

    /// <inheritdoc/>>
    public Creator Creator { get; internal set; }

    /// <inheritdoc/>>
    public DateTime Created { get; internal set; }

    /// <summary>
    /// Gets the templates to create notifications based of
    /// </summary>
    public List<INotificationTemplate> Templates { get; internal set; } = new List<INotificationTemplate>();

    /// <summary>
    /// Gets a list of recipients
    /// </summary>
    public List<Recipient> Recipients { get; internal set; } = new List<Recipient>();

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationOrder"/> class.
    /// </summary>
    public NotificationOrder(
        Guid id,
        string? sendersReference,
        List<INotificationTemplate> templates,
        DateTime requestedSendTime,
        NotificationChannel notificationChannel,
        Creator creator,
        DateTime created,
        List<Recipient> recipients,
        bool? ignoreReservation,
        string? resourceId)
    {
        Id = id;
        SendersReference = sendersReference;
        Templates = templates;
        RequestedSendTime = requestedSendTime;
        NotificationChannel = notificationChannel;
        Creator = creator;
        Created = created;
        Recipients = recipients;
        IgnoreReservation = ignoreReservation;
        ResourceId = resourceId;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="NotificationOrder"/> class.
    /// </summary>
    internal NotificationOrder()
    {
        Creator = new Creator(string.Empty);
    }

    /// <summary>
    /// Json serializes the <see cref="NotificationOrder"/>
    /// </summary>
    public string Serialize()
    {
        return JsonSerializer.Serialize(this, JsonSerializerOptionsProvider.Options);
    }

    /// <summary>
    /// Deserialize a json string into the <see cref="NotificationOrder"/>
    /// </summary>
    public static NotificationOrder? Deserialize(string serializedString)
    {
        return JsonSerializer.Deserialize<NotificationOrder>(serializedString, JsonSerializerOptionsProvider.Options);
    }

    /// <summary>
    /// Try to parse a json string into a<see cref="NotificationOrder"/>
    /// </summary>
    public static bool TryParse(string input, out NotificationOrder value)
    {
        NotificationOrder? parsedOutput;
        value = new NotificationOrder();

        if (string.IsNullOrEmpty(input))
        {
            return false;
        }

        try
        {
            parsedOutput = Deserialize(input!);

            value = parsedOutput!;
            return value.Id != Guid.Empty;
        }
        catch
        {
            // try parse, we simply return false if fails
        }

        return false;
    }
}
